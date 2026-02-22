import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bar Golf Drinks Tracker",
  description: "Track drinks, progress, and leaderboard stats across the cruise bars.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <SiteHeader user={user} />
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
