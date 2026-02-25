"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
  });
}
