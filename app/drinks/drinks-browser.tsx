"use client";

import { useMemo, useState } from "react";

import { logDrinkAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDrinkAnchorId } from "@/lib/drink-anchor";

type DrinkTypeRow = {
  id: string;
  name: string;
};

type BarRow = {
  id: string;
  name: string;
};

type DrinkWithMeta = {
  id: string;
  name: string;
  description: string | null;
  premium: boolean;
  type_id: string;
  typeName: string;
  barsForDrink: BarRow[];
  drinkers: string[];
  tried: boolean;
};

type DrinksBrowserProps = {
  bars: BarRow[];
  drinks: DrinkWithMeta[];
  initialBarId: string;
  initialHidePremium: boolean;
  initialHideNonAlcoholic: boolean;
  initialHideWines: boolean;
  initialQuery: string;
  initialTypeId: string;
  initialUntriedOnly: boolean;
  types: DrinkTypeRow[];
};

function foldForSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function DrinksBrowser({
  bars,
  drinks,
  initialBarId,
  initialHidePremium,
  initialHideNonAlcoholic,
  initialHideWines,
  initialQuery,
  initialTypeId,
  initialUntriedOnly,
  types,
}: DrinksBrowserProps) {
  const [query, setQuery] = useState(initialQuery);
  const [typeId, setTypeId] = useState(initialTypeId);
  const [barId, setBarId] = useState(initialBarId);
  const [hidePremium, setHidePremium] = useState(initialHidePremium);
  const [hideNonAlcoholic, setHideNonAlcoholic] = useState(initialHideNonAlcoholic);
  const [hideWines, setHideWines] = useState(initialHideWines);
  const [untriedOnly, setUntriedOnly] = useState(initialUntriedOnly);

  const nonAlcoholicTypeIds = useMemo(() => {
    const targetTypeNames = new Set(["soft mixer", "zero proof"]);
    return new Set(types.filter((type) => targetTypeNames.has(type.name.toLowerCase())).map((type) => type.id));
  }, [types]);

  const wineTypeIds = useMemo(() => {
    const targetTypeNames = new Set(["white wine", "red wine", "rose wine", "rosé wine", "sparkling wine"]);
    return new Set(types.filter((type) => targetTypeNames.has(type.name.toLowerCase())).map((type) => type.id));
  }, [types]);

  const normalizedQuery = foldForSearch(query.trim());

  function handleResetFilters() {
    setQuery("");
    setTypeId("");
    setBarId("");
    setHidePremium(false);
    setHideNonAlcoholic(false);
    setHideWines(false);
    setUntriedOnly(false);
  }

  function handleFilterAll() {
    setHidePremium(true);
    setHideNonAlcoholic(true);
    setHideWines(true);
    setUntriedOnly(true);
  }

  const visibleDrinks = useMemo(() => {
    return drinks.filter((drink) => {
      if (typeId && drink.type_id !== typeId) {
        return false;
      }

      if (barId && !drink.barsForDrink.some((bar) => bar.id === barId)) {
        return false;
      }

      if (hidePremium && drink.premium) {
        return false;
      }

      if (hideNonAlcoholic && nonAlcoholicTypeIds.has(drink.type_id)) {
        return false;
      }

      if (hideWines && wineTypeIds.has(drink.type_id)) {
        return false;
      }

      if (untriedOnly && drink.tried) {
        return false;
      }

      if (normalizedQuery) {
        const searchable = foldForSearch(`${drink.name} ${drink.description ?? ""} ${drink.typeName}`);
        if (!searchable.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [barId, drinks, hideNonAlcoholic, hidePremium, hideWines, nonAlcoholicTypeIds, normalizedQuery, typeId, untriedOnly, wineTypeIds]);

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
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              name="q"
              placeholder="Search drinks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="md:col-span-2"
            />

            <select
              name="type"
              value={typeId}
              onChange={(event) => setTypeId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All types</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              name="bar"
              value={barId}
              onChange={(event) => setBarId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All bars</option>
              {bars.map((bar) => (
                <option key={bar.id} value={bar.id}>
                  {bar.name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="hidePremium"
                checked={hidePremium}
                onChange={(event) => setHidePremium(event.target.checked)}
                className="h-4 w-4"
              />
              Hide premium
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="hideNonAlcoholic"
                checked={hideNonAlcoholic}
                onChange={(event) => setHideNonAlcoholic(event.target.checked)}
                className="h-4 w-4"
              />
              Hide non-alcoholic
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="hideWines"
                checked={hideWines}
                onChange={(event) => setHideWines(event.target.checked)}
                className="h-4 w-4"
              />
              Hide wines
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="untried"
                checked={untriedOnly}
                onChange={(event) => setUntriedOnly(event.target.checked)}
                className="h-4 w-4"
              />
              Untried only
            </label>

            <div className="flex items-center gap-2 md:col-span-5">
              <Button type="button" variant="outline" onClick={handleResetFilters}>
                Reset filters
              </Button>
              <Button type="button" onClick={handleFilterAll}>
                Filter all
              </Button>
            </div>
          </div>
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
                    <TableCell>{drink.drinkers.length > 0 ? drink.drinkers.join(", ") : "-"}</TableCell>
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
