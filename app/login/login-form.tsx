"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError?: string;
};

export function LoginForm({ initialError }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginWithFacebook() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const nextPath = searchParams.get("next") || "/dashboard";
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set("next", nextPath);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Facebook.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const nextPath = searchParams.get("next") || "/dashboard";
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set("next", nextPath);
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (authError) {
        throw authError;
      }

      setMessage("Magic link sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Button type="button" className="w-full" onClick={loginWithFacebook} disabled={loading}>
        Continue with Facebook
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form className="space-y-3" onSubmit={sendMagicLink}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
          Send magic link
        </Button>
      </form>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
