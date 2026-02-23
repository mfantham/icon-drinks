import Link from "next/link";

import type { User } from "@supabase/supabase-js";

import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

type SiteHeaderProps = {
  user: User | null;
};

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Bar Golf Tracker
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Dashboard
              </Link>
              <Link href="/bars" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Bars
              </Link>
              <Link href="/drinks" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Drinks
              </Link>
              <Link href="/my-logs" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                My Logs
              </Link>
              <Link href="/team" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Team
              </Link>
              <form action={signOutAction}>
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
