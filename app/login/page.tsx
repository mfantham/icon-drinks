import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const error = getParam(resolvedSearchParams.error);

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use Facebook, or request an email magic link as fallback.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm initialError={error} />
        </CardContent>
      </Card>
    </div>
  );
}
