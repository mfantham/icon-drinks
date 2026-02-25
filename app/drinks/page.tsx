import { logDrinkAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReadableUserName, requireUser } from "@/lib/auth";
import { getDrinkAnchorId } from "@/lib/drink-anchor";
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
  const premiumOnly = getSingle(resolvedSearchParams.premium) === "1";
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

  const visibleDrinks = drinks
    .map((drink) => {
      const barsForDrink = (barIdsByDrinkId.get(drink.id) ?? [])
        .map((id) => barById.get(id))
        .filter((bar): bar is BarRow => Boolean(bar));

      return {
        ...drink,
        typeName: typeNameById.get(drink.type_id) ?? "Unknown",
        barsForDrink,
      };
    })
    .filter((drink) => {
      if (typeId && drink.type_id !== typeId) {
        return false;
      }

      if (barId && !drink.barsForDrink.some((bar) => bar.id === barId)) {
        return false;
      }

      if (premiumOnly && !drink.premium) {
        return false;
      }

      if (untriedOnly && triedSet.has(drink.id)) {
        return false;
      }

      if (query) {
        const searchable = `${drink.name} ${drink.description ?? ""} ${drink.typeName}`.toLowerCase();
        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => a.typeName.localeCompare(b.typeName) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drinks Browser</h1>
        <p className="text-sm text-muted-foreground">Search the full list, filter by bar/type, and log drinks instantly.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" method="get">
            <Input name="q" placeholder="Search drinks" defaultValue={getSingle(resolvedSearchParams.q)} className="md:col-span-2" />

            <select
              name="type"
              defaultValue={typeId}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All types</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            <select name="bar" defaultValue={barId} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All bars</option>
              {bars.map((bar) => (
                <option key={bar.id} value={bar.id}>
                  {bar.name}
                </option>
              ))}
            </select>

            <Button type="submit">Apply</Button>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="premium" value="1" defaultChecked={premiumOnly} className="h-4 w-4" />
              Premium only
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="untried" value="1" defaultChecked={untriedOnly} className="h-4 w-4" />
              Untried only
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{visibleDrinks.length} drinks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Bars</TableHead>
                <TableHead>Drunk by</TableHead>
                <TableHead>Log it</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleDrinks.map((drink) => {
                const drinkers = drinkerNamesByDrinkId.get(drink.id) ?? [];

                return (
                  <TableRow
                    key={drink.id}
                    id={getDrinkAnchorId(drink.name)}
                    className="drink-row [&>td]:transition-colors"
                  >
                    <TableCell>{drink.typeName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {drink.premium ? (
                          <span className="group relative inline-flex items-center">
                            <button
                              type="button"
                              className="rounded-sm leading-none text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              aria-label="Premium drink"
                            >
                              ★!
                            </button>
                            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold lowercase tracking-wide text-background shadow-sm group-hover:block group-focus-within:block">
                              premium
                            </span>
                          </span>
                        ) : null}
                        <span>{drink.name}</span>
                      </div>
                      {drink.description ? <div className="text-xs text-muted-foreground">{drink.description}</div> : null}
                    </TableCell>
                    <TableCell>{drink.barsForDrink.map((bar) => bar.name).join(", ") || "-"}</TableCell>
                    <TableCell>{drinkers.length > 0 ? drinkers.join(", ") : "-"}</TableCell>
                    <TableCell>
                      <form action={logDrinkAction} className="flex items-center gap-2">
                        <input type="hidden" name="drinkId" value={drink.id} />

                        {drink.barsForDrink.length > 1 ? (
                          <select name="barId" className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                            <option value="">No bar</option>
                            {drink.barsForDrink.map((bar) => (
                              <option key={bar.id} value={bar.id}>
                                {bar.name}
                              </option>
                            ))}
                          </select>
                        ) : drink.barsForDrink.length === 1 ? (
                          <input type="hidden" name="barId" value={drink.barsForDrink[0].id} />
                        ) : null}

                        <Button type="submit" size="sm">
                          Log it
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
