import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordResetRequestCard } from "@/components/auth/password-reset-request-card";
import { createServerClient } from "@/lib/supabase/server";

export default async function ForgotPasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Passwort vergessen</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Neues Passwort per E-Mail anfordern</h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            Wenn dein Konto existiert, bekommst du einen Reset-Link per E-Mail. Darueber kannst du dein Passwort sicher erneuern.
          </p>
          <p className="text-sm text-muted-foreground">
            Wieder eingefallen? <Link href="/login" className="text-primary hover:text-primary/80">Zurueck zum Login</Link>
          </p>
        </div>
        <PasswordResetRequestCard />
      </div>
    </div>
  );
}