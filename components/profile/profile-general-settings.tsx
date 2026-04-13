"use client";

import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function ProfileGeneralSettings({ user }: { user: User }) {
  const createdAt = user.created_at ? new Date(user.created_at) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allgemeine Einstellungen</CardTitle>
        <CardDescription>Grundlegende Informationen über dein Konto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>User ID</Label>
          <Input value={user.id} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Deine eindeutige Benutzer-Identifikation</p>
        </div>

        <div className="space-y-2">
          <Label>E-Mail</Label>
          <Input value={user.email || "—"} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            {user.email_confirmed_at ? "✓ Bestätigt" : "✗ Nicht bestätigt"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Provider</Label>
          <Input value={user.user_metadata?.provider || "email"} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label>Konto erstellt am</Label>
          <Input
            value={createdAt ? format(createdAt, "dd. MMMM yyyy HH:mm", { locale: de }) : "—"}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label>Letzter Login</Label>
          <Input
            value={user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "dd. MMMM yyyy HH:mm", { locale: de }) : "—"}
            disabled
            className="bg-muted"
          />
        </div>
      </CardContent>
    </Card>
  );
}
