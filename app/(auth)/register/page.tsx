import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { createServerClient } from "@/lib/supabase/server";

export default async function RegisterPage() {
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
          <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Registrieren</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Eigenes SHARINGKING-Konto anlegen</h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            Mit Konto bekommst du dein Dashboard, unbegrenzt viele Uploads innerhalb des 2-GB-Tageslimits und direkte Verwaltung aller Links.
          </p>
          <p className="text-sm text-muted-foreground">
            Bereits registriert? <Link href="/login" className="text-primary hover:text-primary/80">Zum Login</Link>
          </p>
        </div>
        <AuthCard mode="register" />
      </div>
    </div>
  );
}