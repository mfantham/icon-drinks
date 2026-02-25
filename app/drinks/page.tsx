import { DrinksBrowser } from "./drinks-browser";
import { getReadableUserName, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DrinksPageProps = {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

type DrinkTypeRow = {
  id: string;
  name: string;
};

type BarRow = {
  id: string;
  name: string;
};

type DrinkRow = {
  id: string;
  name: string;
  description: string | null;
  premium: boolean;
  type_id: string;
};

type AvailabilityRow = {
  drink_id: string;
  bar_id: string;
};

type DrinkLogRow = {
  user_id: string;
  drink_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

function getSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export default async function DrinksPage({ searchParams }: DrinksPageProps) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = (await searchParams) ?? {};

  const query = getSingle(resolvedSearchParams.q).trim().toLowerCase();
  const typeId = getSingle(resolvedSearchParams.type);
  const barId = getSingle(resolvedSearchParams.bar);
  const hidePremium = getSingle(resolvedSearchParams.hidePremium) === "1";
  const hideNonAlcoholic = getSingle(resolvedSearchParams.hideNonAlcoholic) === "1";
  const hideWines = getSingle(resolvedSearchParams.hideWines) === "1";
  const untriedOnly = getSingle(resolvedSearchParams.untried) === "1";

  const [typesRes, barsRes, drinksRes, availabilityRes, allLogsRes, profilesRes] = await Promise.all([
    supabase.from("drink_types").select("id,name").order("name", { ascending: true }),
    supabase.from("bars").select("id,name").order("name", { ascending: true }),
    supabase.from("drinks").select("id,name,description,premium,type_id"),
    supabase.from("drink_availability").select("drink_id,bar_id"),
    supabase.from("drink_logs").select("user_id,drink_id"),
    supabase.from("profiles").select("id,display_name"),
  ]);

  throwIfError(typesRes.error, "Failed to load drink types");
  throwIfError(barsRes.error, "Failed to load bars");
  throwIfError(drinksRes.error, "Failed to load drinks");
  throwIfError(availabilityRes.error, "Failed to load availability");
  throwIfError(allLogsRes.error, "Failed to load drink logs");
  throwIfError(profilesRes.error, "Failed to load profiles");

  const types = (typesRes.data ?? []) as DrinkTypeRow[];
  const bars = (barsRes.data ?? []) as BarRow[];
  const drinks = (drinksRes.data ?? []) as DrinkRow[];
  const availabilityRows = (availabilityRes.data ?? []) as AvailabilityRow[];
  const allLogs = (allLogsRes.data ?? []) as DrinkLogRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];

  const typeNameById = new Map(types.map((type) => [type.id, type.name]));
  const barById = new Map(bars.map((bar) => [bar.id, bar]));

  const profileNameById = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const barIdsByDrinkId = new Map<string, string[]>();
  for (const row of availabilityRows) {
    if (!barIdsByDrinkId.has(row.drink_id)) {
      barIdsByDrinkId.set(row.drink_id, []);
    }

    barIdsByDrinkId.get(row.drink_id)?.push(row.bar_id);
  }

  for (const [drinkId, drinkBarIds] of barIdsByDrinkId.entries()) {
    drinkBarIds.sort((a, b) => {
      const first = barById.get(a)?.name ?? "";
      const second = barById.get(b)?.name ?? "";
      return first.localeCompare(second);
    });

    barIdsByDrinkId.set(drinkId, Array.from(new Set(drinkBarIds)));
  }

  const triedSet = new Set(allLogs.filter((log) => log.user_id === user.id).map((log) => log.drink_id));
  const drinkerNamesByDrinkId = new Map<string, string[]>();

  for (const log of allLogs) {
    if (!drinkerNamesByDrinkId.has(log.drink_id)) {
      drinkerNamesByDrinkId.set(log.drink_id, []);
    }

    const userName = getReadableUserName(profileNameById.get(log.user_id), log.user_id);
    drinkerNamesByDrinkId.get(log.drink_id)?.push(userName);
  }

  for (const [drinkId, names] of drinkerNamesByDrinkId.entries()) {
    drinkerNamesByDrinkId.set(drinkId, Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
  }

  const drinksWithMeta = drinks
    .map((drink) => {
      const barsForDrink = (barIdsByDrinkId.get(drink.id) ?? [])
        .map((id) => barById.get(id))
        .filter((bar): bar is BarRow => Boolean(bar));

      return {
        ...drink,
        typeName: typeNameById.get(drink.type_id) ?? "Unknown",
        barsForDrink,
        drinkers: drinkerNamesByDrinkId.get(drink.id) ?? [],
        tried: triedSet.has(drink.id),
      };
    })
    .sort((a, b) => a.typeName.localeCompare(b.typeName) || a.name.localeCompare(b.name));

  return (
    <DrinksBrowser
      bars={bars}
      drinks={drinksWithMeta}
      initialBarId={barId}
      initialHidePremium={hidePremium}
      initialHideNonAlcoholic={hideNonAlcoholic}
      initialHideWines={hideWines}
      initialQuery={query}
      initialTypeId={typeId}
      initialUntriedOnly={untriedOnly}
      types={types}
    />
  );
}
