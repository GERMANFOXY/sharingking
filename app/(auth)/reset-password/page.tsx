import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordUpdateCard } from "@/components/auth/password-update-card";
import { createServerClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Passwort aktualisieren</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Vergib deinem Konto ein neues Passwort</h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            Dieser Schritt ist nur nach einem gueltigen Reset-Link verfuegbar. Danach bist du weiterhin eingeloggt und landest direkt im Dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            Kein gueltiger Link mehr? <Link href="/forgot-password" className="text-primary hover:text-primary/80">Neuen Reset-Link anfordern</Link>
          </p>
        </div>
        <PasswordUpdateCard />
      </div>
    </div>
  );
}