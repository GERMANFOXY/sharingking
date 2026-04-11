"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck, ShieldCheck } from "lucide-react";

import { loginAction, registerAction, sendMagicLinkAction, type AuthActionState } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = {};

type AuthCardProps = {
  mode: "login" | "register";
};

export function AuthCard({ mode }: AuthCardProps) {
  const [authState, authAction] = useActionState(mode === "login" ? loginAction : registerAction, initialState);
  const [magicState, magicAction] = useActionState(sendMagicLinkAction, initialState);

  return (
    <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Anmelden" : "Konto erstellen"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Mit E-Mail und Passwort direkt ins Dashboard oder per Magic Link ohne Passwort."
            : "Erstelle dein Konto mit E-Mail und Passwort. Alternativ kannst du dir direkt einen Magic Link schicken lassen."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={authAction} className="space-y-4">
          <Input type="email" name="email" placeholder="name@beispiel.de" autoComplete="email" required />
          <Input type="password" name="password" placeholder="Passwort" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          {mode === "login" ? (
            <div className="-mt-1 flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80">
                Passwort vergessen?
              </Link>
            </div>
          ) : null}
          {mode === "register" ? (
            <Input type="password" name="confirmPassword" placeholder="Passwort wiederholen" autoComplete="new-password" required />
          ) : null}

          {authState.error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{authState.error}</div> : null}
          {authState.success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{authState.success}</div> : null}

          <SubmitButton className="w-full" pendingText={mode === "login" ? "Anmeldung laeuft..." : "Registrierung laeuft..."}>
            {mode === "login" ? "Einloggen" : "Konto erstellen"}
          </SubmitButton>
        </form>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-white">
            <MailCheck className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">Magic Link</h3>
          </div>
          <form action={magicAction} className="space-y-4">
            <Input type="email" name="email" placeholder="name@beispiel.de" autoComplete="email" required />

            {magicState.error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{magicState.error}</div> : null}
            {magicState.success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{magicState.success}</div> : null}

            <SubmitButton className="w-full" variant="secondary" pendingText="Magic Link wird versendet...">
              Magic Link senden
            </SubmitButton>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Sicherer Kontozugang</span>
          </div>
          {mode === "login" ? (
            <p>
              Noch kein Konto? <Link href="/register" className="text-primary hover:text-primary/80">Jetzt registrieren</Link>
            </p>
          ) : (
            <p>
              Schon registriert? <Link href="/login" className="text-primary hover:text-primary/80">Zum Login</Link>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}