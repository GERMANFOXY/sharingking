"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { sendPasswordResetAction, type AuthActionState } from "@/app/actions/auth-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = {};

export function PasswordResetRequestCard() {
  const [state, action] = useActionState(sendPasswordResetAction, initialState);

  return (
    <Card className="w-full border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Passwort zuruecksetzen</CardTitle>
        <CardDescription>
          Wir schicken dir einen sicheren Link per E-Mail. Darueber kannst du direkt ein neues Passwort setzen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={action} className="space-y-4">
          <Input type="email" name="email" placeholder="name@beispiel.de" autoComplete="email" required />

          {state.error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{state.error}</div> : null}
          {state.success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{state.success}</div> : null}

          <SubmitButton className="w-full" pendingText="Reset-Link wird versendet...">
            Reset-Link senden
          </SubmitButton>
        </form>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 text-white">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Sicherer Reset</span>
          </div>
          <p>Der Link ist nur fuer kurze Zeit gueltig und setzt das Passwort nur fuer dieses Konto neu.</p>
        </div>
      </CardContent>
    </Card>
  );
}