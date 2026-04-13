"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

export default function ProfileEmailChange({ user }: { user: User }) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  const handleChangeEmail = async () => {
    if (!newEmail) {
      setMessage({ type: "error", text: "Bitte gib eine neue E-Mail-Adresse ein" });
      return;
    }

    if (newEmail === user.email) {
      setMessage({ type: "error", text: "Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Bestätigungslink wurde an deine neue E-Mail-Adresse gesendet. Überprüfe deinen Posteingang!",
        });
        setNewEmail("");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Ein Fehler ist aufgetreten" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Mail-Adresse ändern</CardTitle>
        <CardDescription>Aktualisiere deine E-Mail-Adresse für dein Konto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Aktuelle E-Mail</Label>
          <Input value={user.email || "—"} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-email">Neue E-Mail-Adresse</Label>
          <Input
            id="new-email"
            type="email"
            placeholder="neue.email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Du erhältst einen Bestätigungslink an die neue E-Mail-Adresse
          </p>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertTitle>{message.type === "error" ? "Fehler" : "Erfolg"}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleChangeEmail} disabled={loading} className="w-full">
          {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Wird gesendet..." : "E-Mail ändern"}
        </Button>
      </CardContent>
    </Card>
  );
}
