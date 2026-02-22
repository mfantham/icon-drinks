import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function DashboardPage() {
  await requireUser();
  const data = await getDashboardData();

  const percent = data.overall.totalDrinks
    ? Math.round((data.overall.triedDrinks / data.overall.totalDrinks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Group progress, category stats, leaderboard, and recent activity.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completion</CardTitle>
          <CardDescription>{percent}% of all drinks have been tried by the group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </CardContent>
      </Card>

      <DashboardCharts overall={data.overall} byType={data.byType} byBar={data.byBar} leaderboard={data.leaderboard} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 20 logs across all users.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="rounded-md border p-3 text-sm">
                  <span className="font-semibold">{item.userName}</span> logged <span className="font-semibold">{item.drinkName}</span>{" "}
                  ({item.drinkType})
                  {item.barName ? ` at ${item.barName}` : ""}.
                  <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
