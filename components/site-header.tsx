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
      <div className="container py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-base font-semibold tracking-tight sm:text-lg">
            Bar Golf Tracker
          </Link>

          <nav className="w-full sm:w-auto">
            {user ? (
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-center text-sm font-medium hover:bg-muted"
                >
                  Dashboard
                </Link>
                <Link href="/bars" className="rounded-md px-3 py-2 text-center text-sm font-medium hover:bg-muted">
                  Bars
                </Link>
                <Link href="/drinks" className="rounded-md px-3 py-2 text-center text-sm font-medium hover:bg-muted">
                  Drinks
                </Link>
                <Link href="/my-logs" className="rounded-md px-3 py-2 text-center text-sm font-medium hover:bg-muted">
                  My Logs
                </Link>
                <Link href="/team" className="rounded-md px-3 py-2 text-center text-sm font-medium hover:bg-muted">
                  Team
                </Link>
                <form action={signOutAction} className="col-span-3 sm:col-span-1">
                  <Button variant="outline" size="sm" type="submit" className="w-full sm:w-auto">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="block sm:inline-flex">
                <Button size="sm" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
