import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BarsPageProps = {
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
  type_id: string;
};

type AvailabilityRow = {
  drink_id: string;
  bar_id: string;
};

type DecoratedDrink = DrinkRow & {
  typeName: string;
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

function sortByTypeThenName(first: DecoratedDrink, second: DecoratedDrink) {
  return first.typeName.localeCompare(second.typeName) || first.name.localeCompare(second.name);
}

function groupByType(drinks: DecoratedDrink[]) {
  const drinksByType = new Map<string, DecoratedDrink[]>();

  for (const drink of drinks) {
    if (!drinksByType.has(drink.typeName)) {
      drinksByType.set(drink.typeName, []);
    }

    drinksByType.get(drink.typeName)?.push(drink);
  }

  return Array.from(drinksByType.entries()).sort((first, second) => first[0].localeCompare(second[0]));
}

function DrinkTypeList({ drinks }: { drinks: DecoratedDrink[] }) {
  const sections = groupByType(drinks);

  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">No drinks in this section.</p>;
  }

  return (
    <div className="space-y-5">
      {sections.map(([typeName, typeDrinks]) => (
        <section key={typeName} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{typeName}</h3>
          <ul className="space-y-2">
            {typeDrinks.map((drink) => (
              <li key={drink.id} className="rounded-lg border bg-background/60 p-3">
                <p className="font-medium">{drink.name}</p>
                {drink.description ? <p className="text-sm text-muted-foreground">{drink.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default async function BarsPage({ searchParams }: BarsPageProps) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedBarIdFromSearch = getSingle(resolvedSearchParams.bar);

  const [typesRes, barsRes, drinksRes, availabilityRes] = await Promise.all([
    supabase.from("drink_types").select("id,name").order("name", { ascending: true }),
    supabase.from("bars").select("id,name").order("name", { ascending: true }),
    supabase.from("drinks").select("id,name,description,type_id"),
    supabase.from("drink_availability").select("drink_id,bar_id"),
  ]);

  throwIfError(typesRes.error, "Failed to load drink types");
  throwIfError(barsRes.error, "Failed to load bars");
  throwIfError(drinksRes.error, "Failed to load drinks");
  throwIfError(availabilityRes.error, "Failed to load availability");

  const drinkTypes = (typesRes.data ?? []) as DrinkTypeRow[];
  const bars = (barsRes.data ?? []) as BarRow[];
  const drinks = (drinksRes.data ?? []) as DrinkRow[];
  const availabilityRows = (availabilityRes.data ?? []) as AvailabilityRow[];

  const selectedBar = bars.find((bar) => bar.id === selectedBarIdFromSearch) ?? bars[0] ?? null;
  const typeNameById = new Map(drinkTypes.map((type) => [type.id, type.name]));

  const availableBarIdsByDrinkId = new Map<string, Set<string>>();
  const availableDrinkIdsByBar = new Map<string, Set<string>>();

  for (const row of availabilityRows) {
    if (!availableBarIdsByDrinkId.has(row.drink_id)) {
      availableBarIdsByDrinkId.set(row.drink_id, new Set());
    }
    if (!availableDrinkIdsByBar.has(row.bar_id)) {
      availableDrinkIdsByBar.set(row.bar_id, new Set());
    }

    availableBarIdsByDrinkId.get(row.drink_id)?.add(row.bar_id);
    availableDrinkIdsByBar.get(row.bar_id)?.add(row.drink_id);
  }

  const drinksAtSelectedBar = selectedBar
    ? drinks
        .filter((drink) => availableDrinkIdsByBar.get(selectedBar.id)?.has(drink.id) ?? false)
        .map((drink) => ({
          ...drink,
          typeName: typeNameById.get(drink.type_id) ?? "Unknown",
        }))
        .sort(sortByTypeThenName)
    : [];

  const uniqueDrinkIds = new Set(
    drinksAtSelectedBar
      .filter((drink) => (availableBarIdsByDrinkId.get(drink.id)?.size ?? 0) === 1)
      .map((drink) => drink.id)
  );

  const uniqueDrinks = drinksAtSelectedBar.filter((drink) => uniqueDrinkIds.has(drink.id));
  const otherDrinks = drinksAtSelectedBar.filter((drink) => !uniqueDrinkIds.has(drink.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bar-First Drinks</h1>
        <p className="text-sm text-muted-foreground">
          Pick a bar to see what is available there, with bar-exclusive drinks highlighted first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose a bar</CardTitle>
          <CardDescription>Drink lists are sorted by type and show drink descriptions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              name="bar"
              defaultValue={selectedBar?.id ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {bars.map((bar) => (
                <option key={bar.id} value={bar.id}>
                  {bar.name}
                </option>
              ))}
            </select>
            <Button type="submit">View bar menu</Button>
          </form>

          {selectedBar ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{selectedBar.name}</Badge>
              <Badge variant="outline">{drinksAtSelectedBar.length} total drinks</Badge>
              <Badge variant="success">{uniqueDrinks.length} unique drinks</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No bars are configured yet.</p>
          )}
        </CardContent>
      </Card>

      {selectedBar ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Unique to {selectedBar.name}</CardTitle>
              <CardDescription>Only available in this bar.</CardDescription>
            </CardHeader>
            <CardContent>
              <DrinkTypeList drinks={uniqueDrinks} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Everything Else at {selectedBar.name}</CardTitle>
              <CardDescription>Also available in other bars.</CardDescription>
            </CardHeader>
            <CardContent>
              <DrinkTypeList drinks={otherDrinks} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
