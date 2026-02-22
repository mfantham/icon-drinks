import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          const mutableCookies = cookieStore as unknown as {
            set: (name: string, value: string, options?: Record<string, unknown>) => void;
          };

          cookiesToSet.forEach(({ name, value, options }) => {
            mutableCookies.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies.
        }
      },
    },
  });
}
