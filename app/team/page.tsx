import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReadableUserName, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type DrinkLogRow = {
  user_id: string;
  drink_id: string;
  created_at: string;
};

type TeamStats = {
  totalLogs: number;
  uniqueDrinkIds: Set<string>;
  lastLoggedAt: string | null;
};

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export default async function TeamPage() {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const [profilesRes, logsRes] = await Promise.all([
    supabase.from("profiles").select("id,display_name"),
    supabase.from("drink_logs").select("user_id,drink_id,created_at"),
  ]);

  throwIfError(profilesRes.error, "Failed to load team members");
  throwIfError(logsRes.error, "Failed to load drink logs");

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const logs = (logsRes.data ?? []) as DrinkLogRow[];

  const statsByUser = new Map<string, TeamStats>();

  for (const log of logs) {
    if (!statsByUser.has(log.user_id)) {
      statsByUser.set(log.user_id, {
        totalLogs: 0,
        uniqueDrinkIds: new Set<string>(),
        lastLoggedAt: null,
      });
    }

    const stats = statsByUser.get(log.user_id);
    if (!stats) {
      continue;
    }

    stats.totalLogs += 1;
    stats.uniqueDrinkIds.add(log.drink_id);

    if (!stats.lastLoggedAt || new Date(log.created_at).getTime() > new Date(stats.lastLoggedAt).getTime()) {
      stats.lastLoggedAt = log.created_at;
    }
  }

  const teamRows = profiles
    .map((profile) => {
      const stats = statsByUser.get(profile.id);
      const name = getReadableUserName(profile.display_name, profile.id);

      return {
        id: profile.id,
        name,
        totalLogs: stats?.totalLogs ?? 0,
        uniqueDrinks: stats?.uniqueDrinkIds.size ?? 0,
        lastLoggedAt: stats?.lastLoggedAt ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">See everyone on board and how many drinks each person has logged.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{teamRows.length} signed up</CardTitle>
          <CardDescription>Click a team member to open their full drink log.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Total Logs</TableHead>
                <TableHead>Unique Drinks</TableHead>
                <TableHead>Last Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamRows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link href={`/team/${member.id}`} className="font-medium text-primary hover:underline">
                      {member.name}
                    </Link>
                  </TableCell>
                  <TableCell>{member.totalLogs}</TableCell>
                  <TableCell>{member.uniqueDrinks}</TableCell>
                  <TableCell>{member.lastLoggedAt ? new Date(member.lastLoggedAt).toLocaleString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
