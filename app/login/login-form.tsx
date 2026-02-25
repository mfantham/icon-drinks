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

type AuthMode = "signIn" | "register";

function normalizeFirstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

export function LoginForm({ initialError }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegisterMode = mode === "register";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const normalizedFirstName = normalizeFirstName(firstName);

    if (isRegisterMode && !normalizedFirstName) {
      setError("First name is required to create an account.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const nextPath = searchParams.get("next") || "/dashboard";
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set("next", nextPath);

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: isRegisterMode,
          ...(isRegisterMode
            ? {
                data: {
                  first_name: normalizedFirstName,
                },
              }
            : {}),
        },
      });

      if (authError) {
        throw authError;
      }

      setMessage(
        isRegisterMode ? "Check your inbox to finish creating your account." : "Magic link sent. Check your inbox."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isRegisterMode
            ? "Unable to create account with magic link."
            : "Unable to send magic link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={isRegisterMode ? "outline" : "default"}
          onClick={() => switchMode("signIn")}
          disabled={loading}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={isRegisterMode ? "default" : "outline"}
          onClick={() => switchMode("register")}
          disabled={loading}
        >
          Create account
        </Button>
      </div>

      <form className="space-y-3" onSubmit={sendMagicLink}>
        {isRegisterMode ? (
          <>
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Alex"
            />
          </>
        ) : null}

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
          {isRegisterMode ? "Create account with magic link" : "Send sign-in link"}
        </Button>
      </form>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
