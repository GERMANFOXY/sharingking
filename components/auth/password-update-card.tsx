"use client";

import { useActionState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

import { updatePasswordAction, type AuthActionState } from "@/app/actions/auth-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = {};

export function PasswordUpdateCard() {
  const [state, action] = useActionState(updatePasswordAction, initialState);

  return (
    <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Neues Passwort setzen</CardTitle>
        <CardDescription>
          Vergib jetzt ein neues Passwort fuer dein SHARINGKING-Konto. Danach landest du direkt wieder im Dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={action} className="space-y-4">
          <Input type="password" name="password" placeholder="Neues Passwort" autoComplete="new-password" required />
          <Input type="password" name="confirmPassword" placeholder="Passwort wiederholen" autoComplete="new-password" required />

          {state.error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{state.error}</div> : null}
          {state.success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{state.success}</div> : null}

          <SubmitButton className="w-full" pendingText="Passwort wird gespeichert...">
            Passwort speichern
          </SubmitButton>
        </form>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Passwort-Regeln</span>
          </div>
          <p>Nutze mindestens acht Zeichen und am besten eine Kombination aus Woertern, Zahlen und Sonderzeichen.</p>
        </div>
      </CardContent>
    </Card>
  );
}