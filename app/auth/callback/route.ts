import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ensureProfile } from "@/lib/auth";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") || "/dashboard";

  if (!code) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "Missing auth code.");
    return NextResponse.redirect(redirectUrl);
  }

  let url = "";
  let publishableKey = "";

  try {
    const env = getSupabaseEnv();
    url = env.url;
    publishableKey = env.publishableKey;
  } catch {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "Supabase env vars are missing.");
    return NextResponse.redirect(redirectUrl);
  }

  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const redirectUrl = new URL(safeNextPath, request.url);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failed = new URL("/login", request.url);
    failed.searchParams.set("error", error.message);
    return NextResponse.redirect(failed);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(user, supabase);
  }

  return response;
}
