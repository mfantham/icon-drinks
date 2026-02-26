"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError?: string;
};

function getSafeNextPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  return value.startsWith("/") ? value : "/dashboard";
}

export function LoginForm({ initialError }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [error, setError] = useState(initialError || "");
  const [loading, setLoading] = useState(false);

  async function continueWithGoogle() {

    setLoading(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const nextPath = getSafeNextPath(searchParams.get("next"));
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set("next", nextPath);

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true,
        },
      });

      if (authError) {
        throw authError;
      }

      if (!data?.url) {
        throw new Error("Unable to start Google sign-in.");
      }

      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start Google sign-in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" className="w-full" onClick={continueWithGoogle} disabled={loading}>
        {loading ? "Redirecting to Google..." : "Continue with Google"}
      </Button>
      <p className="text-sm text-muted-foreground">Use your Google account to sign in or create an account.</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
