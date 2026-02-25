import { cache } from "react";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function extractFirstName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const firstWord = value.trim().split(/\s+/)[0];

  return firstWord?.trim() ?? "";
}

function getProfileFirstName(user: User) {
  const firstFromEmail = user.email?.split("@")[0]?.split(/[._-]/)[0];

  return (
    extractFirstName(user.user_metadata?.first_name) ||
    extractFirstName(user.user_metadata?.given_name) ||
    extractFirstName(user.user_metadata?.full_name) ||
    extractFirstName(user.user_metadata?.name) ||
    extractFirstName(firstFromEmail) ||
    "Golfer"
  );
}

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function ensureProfile(user: User, supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());
  const fallbackName = getProfileFirstName(user);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: fallbackName,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(`Unable to ensure profile: ${error.message}`);
  }
}

export function getReadableUserName(displayName: string | null | undefined, userId: string) {
  if (displayName?.trim()) {
    return displayName;
  }

  return `User ${userId.slice(0, 6)}`;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(email.toLowerCase());
}
