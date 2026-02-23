import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReadableUserName, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TeamMemberLogPageProps = {
  params: {
    userId: string;
  };
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

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

export default async function TeamMemberLogPage({ params }: TeamMemberLogPageProps) {
  await requireUser();
  const { userId } = params;
  const supabase = await createSupabaseServerClient();

  const [profileRes, logsRes, drinksRes, typesRes, barsRes] = await Promise.all([
    supabase.from("profiles").select("id,display_name").eq("id", userId).maybeSingle(),
    supabase.from("drink_logs").select("id,drink_id,bar_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("drinks").select("id,name,type_id"),
    supabase.from("drink_types").select("id,name"),
    supabase.from("bars").select("id,name"),
  ]);

  throwIfError(profileRes.error, "Failed to load team member profile");
  throwIfError(logsRes.error, "Failed to load drink logs");
  throwIfError(drinksRes.error, "Failed to load drinks");
  throwIfError(typesRes.error, "Failed to load drink types");
  throwIfError(barsRes.error, "Failed to load bars");

  const profile = profileRes.data as ProfileRow | null;
  if (!profile) {
    notFound();
  }

  const logs = (logsRes.data ?? []) as DrinkLogRow[];
  const drinks = (drinksRes.data ?? []) as DrinkRow[];
  const drinkTypes = (typesRes.data ?? []) as DrinkTypeRow[];
  const bars = (barsRes.data ?? []) as BarRow[];

  const drinkById = new Map(drinks.map((drink) => [drink.id, drink]));
  const typeById = new Map(drinkTypes.map((type) => [type.id, type]));
  const barById = new Map(bars.map((bar) => [bar.id, bar]));
  const uniqueDrinkCount = new Set(logs.map((log) => log.drink_id)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{getReadableUserName(profile.display_name, profile.id)}</h1>
          <p className="text-sm text-muted-foreground">Full drink history for this team member.</p>
        </div>
        <Link href="/team" className="text-sm font-medium text-primary hover:underline">
          Back to Team
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{logs.length}</CardTitle>
            <CardDescription>Total logged drinks</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{uniqueDrinkCount}</CardTitle>
            <CardDescription>Unique drinks tried</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drink Log</CardTitle>
          <CardDescription>Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Drink</TableHead>
                <TableHead>Bar</TableHead>
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
