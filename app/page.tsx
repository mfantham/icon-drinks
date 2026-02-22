import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-3xl">Cruise Bar Golf Tracker</CardTitle>
          <CardDescription>
            Keep track of every drink, compare progress with your crew, and find what is left to try.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button>Open Dashboard</Button>
              </Link>
              <Link href="/drinks">
                <Button variant="secondary">Browse Drinks</Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button>Sign in to start</Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Track</CardTitle>
          <CardDescription>Log every drink as you go.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compete</CardTitle>
          <CardDescription>See live leaderboard and category progress.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
