"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ByTypeDatum = {
  type: string;
  tried: number;
  remaining: number;
};

type LeaderboardDatum = {
  name: string;
  score: number;
};

type DashboardChartsProps = {
  overall: {
    totalDrinks: number;
    triedDrinks: number;
  };
  byType: ByTypeDatum[];
  byBar: ByTypeDatum[];
  leaderboard: LeaderboardDatum[];
};

const PIE_COLORS = ["#9c4820", "#d6c8b8"];

export function DashboardCharts({ overall, byType, byBar, leaderboard }: DashboardChartsProps) {
  const pieData = [
    { name: "Tried", value: overall.triedDrinks },
    { name: "Remaining", value: Math.max(overall.totalDrinks - overall.triedDrinks, 0) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            {overall.triedDrinks} of {overall.totalDrinks} distinct drinks tried
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((entry, index) => (
                  <Cell key={`pie-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Distinct drinks per user</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leaderboard.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Bar dataKey="score" fill="#2f7668" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Progress By Type</CardTitle>
          <CardDescription>Tried vs remaining</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" angle={-25} textAnchor="end" interval={0} height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="tried" stackId="a" fill="#9c4820" radius={[6, 6, 0, 0]} />
              <Bar dataKey="remaining" stackId="a" fill="#d6c8b8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Per-Bar Coverage</CardTitle>
          <CardDescription>How much of each bar menu has been tried by the group.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byBar} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" angle={-25} textAnchor="end" interval={0} height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="tried" stackId="a" fill="#2f7668" radius={[6, 6, 0, 0]} />
              <Bar dataKey="remaining" stackId="a" fill="#bcd7d1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
