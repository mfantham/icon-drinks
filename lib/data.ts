import { getReadableUserName } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DrinkRow = {
  id: string;
  name: string;
  type_id: string;
};

type DrinkTypeRow = {
  id: string;
  name: string;
};

type DrinkLogRow = {
  id: string;
  user_id: string;
  drink_id: string;
  bar_id: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type BarRow = {
  id: string;
  name: string;
};

type AvailabilityRow = {
  drink_id: string;
  bar_id: string;
};

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();

  const [drinksRes, typesRes, logsRes, profilesRes, recentLogsRes, barsRes, availabilityRes] = await Promise.all([
    supabase.from("drinks").select("id,name,type_id"),
    supabase.from("drink_types").select("id,name"),
    supabase.from("drink_logs").select("id,user_id,drink_id,bar_id,created_at"),
    supabase.from("profiles").select("id,display_name"),
    supabase.from("drink_logs").select("id,user_id,drink_id,bar_id,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("bars").select("id,name").order("name", { ascending: true }),
    supabase.from("drink_availability").select("drink_id,bar_id"),
  ]);

  throwIfError(drinksRes.error, "Failed to load drinks");
  throwIfError(typesRes.error, "Failed to load drink types");
  throwIfError(logsRes.error, "Failed to load logs");
  throwIfError(profilesRes.error, "Failed to load profiles");
  throwIfError(recentLogsRes.error, "Failed to load recent logs");
  throwIfError(barsRes.error, "Failed to load bars");
  throwIfError(availabilityRes.error, "Failed to load availability");

  const drinks = (drinksRes.data ?? []) as DrinkRow[];
  const drinkTypes = (typesRes.data ?? []) as DrinkTypeRow[];
  const allLogs = (logsRes.data ?? []) as DrinkLogRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const recentLogs = (recentLogsRes.data ?? []) as DrinkLogRow[];
  const bars = (barsRes.data ?? []) as BarRow[];
  const availability = (availabilityRes.data ?? []) as AvailabilityRow[];

  const typeNameById = new Map(drinkTypes.map((type) => [type.id, type.name]));
  const drinkById = new Map(drinks.map((drink) => [drink.id, drink]));
  const barNameById = new Map(bars.map((bar) => [bar.id, bar.name]));
  const profileNameById = new Map(profiles.map((profile) => [profile.id, profile.display_name]));

  const triedSet = new Set(allLogs.map((log) => log.drink_id));

  const typeTotals = new Map<string, number>();
  const typeTried = new Map<string, number>();

  for (const drink of drinks) {
    const typeName = typeNameById.get(drink.type_id) ?? "Unknown";
    typeTotals.set(typeName, (typeTotals.get(typeName) ?? 0) + 1);

    if (triedSet.has(drink.id)) {
      typeTried.set(typeName, (typeTried.get(typeName) ?? 0) + 1);
    }
  }

  const byType = Array.from(typeTotals.entries())
    .map(([type, total]) => {
      const tried = typeTried.get(type) ?? 0;
      return {
        type,
        tried,
        remaining: total - tried,
      };
    })
    .sort((a, b) => a.type.localeCompare(b.type));

  const leaderboardMap = new Map<string, Set<string>>();
  for (const log of allLogs) {
    if (!leaderboardMap.has(log.user_id)) {
      leaderboardMap.set(log.user_id, new Set());
    }

    leaderboardMap.get(log.user_id)?.add(log.drink_id);
  }

  const leaderboard = Array.from(leaderboardMap.entries())
    .map(([userId, drinksTried]) => ({
      userId,
      name: getReadableUserName(profileNameById.get(userId), userId),
      score: drinksTried.size,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const availableDrinkIdsByBar = new Map<string, Set<string>>();
  for (const row of availability) {
    if (!availableDrinkIdsByBar.has(row.bar_id)) {
      availableDrinkIdsByBar.set(row.bar_id, new Set());
    }

    availableDrinkIdsByBar.get(row.bar_id)?.add(row.drink_id);
  }

  const byBar = bars.map((bar) => {
    const drinkIds = availableDrinkIdsByBar.get(bar.id) ?? new Set<string>();
    const tried = Array.from(drinkIds).filter((drinkId) => triedSet.has(drinkId)).length;

    return {
      type: bar.name,
      tried,
      remaining: Math.max(drinkIds.size - tried, 0),
    };
  });

  return {
    overall: {
      totalDrinks: drinks.length,
      triedDrinks: triedSet.size,
    },
    byType,
    byBar,
    leaderboard,
    recentActivity: recentLogs.map((log) => {
      const drink = drinkById.get(log.drink_id);
      const typeName = drink ? typeNameById.get(drink.type_id) ?? "Unknown" : "Unknown";

      return {
        id: log.id,
        createdAt: log.created_at,
        userName: getReadableUserName(profileNameById.get(log.user_id), log.user_id),
        drinkName: drink?.name ?? "Unknown drink",
        drinkType: typeName,
        barName: log.bar_id ? barNameById.get(log.bar_id) ?? null : null,
      };
    }),
  };
}
