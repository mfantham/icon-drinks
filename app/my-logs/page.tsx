import { deleteDrinkLogAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DrinkLogRow = {
  id: string;
  drink_id: string;
  bar_id: string | null;
  created_at: string;
};

type DrinkRow = {
  id: string;
  name: string;
  type_id: string;
};

type DrinkTypeRow = {
  id: string;
  name: string;
};

type BarRow = {
  id: string;
  name: string;
};

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export default async function MyLogsPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const [logsRes, drinksRes, typesRes, barsRes] = await Promise.all([
    supabase
      .from("drink_logs")
      .select("id,drink_id,bar_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("drinks").select("id,name,type_id"),
    supabase.from("drink_types").select("id,name"),
    supabase.from("bars").select("id,name"),
  ]);

  throwIfError(logsRes.error, "Failed to load your logs");
  throwIfError(drinksRes.error, "Failed to load drinks");
  throwIfError(typesRes.error, "Failed to load drink types");
  throwIfError(barsRes.error, "Failed to load bars");

  const logs = (logsRes.data ?? []) as DrinkLogRow[];
  const drinks = (drinksRes.data ?? []) as DrinkRow[];
  const drinkTypes = (typesRes.data ?? []) as DrinkTypeRow[];
  const bars = (barsRes.data ?? []) as BarRow[];

  const drinkById = new Map(drinks.map((drink) => [drink.id, drink]));
  const typeById = new Map(drinkTypes.map((type) => [type.id, type]));
  const barById = new Map(bars.map((bar) => [bar.id, bar]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Logs</h1>
        <p className="text-sm text-muted-foreground">Everything you have logged so far.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{logs.length} logs</CardTitle>
          <CardDescription>Delete any entry you logged by mistake.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Drink</TableHead>
                <TableHead>Bar</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const drink = drinkById.get(log.drink_id);
                const type = drink ? typeById.get(drink.type_id) : null;
                const bar = log.bar_id ? barById.get(log.bar_id) : null;

                return (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>{type?.name ?? "Unknown"}</TableCell>
                    <TableCell>{drink?.name ?? "Unknown drink"}</TableCell>
                    <TableCell>{bar?.name ?? "-"}</TableCell>
                    <TableCell>
                      <form action={deleteDrinkLogAction}>
                        <input type="hidden" name="logId" value={log.id} />
                        <Button variant="destructive" size="sm" type="submit">
                          Delete
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
