"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Trash2, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfileDanger({ user }: { user: User }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmText !== "LÖSCHEN") {
      setError('Bitte schreibe "LÖSCHEN" um fortzufahren');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Fehler beim Löschen des Accounts");
      } else {
        // Redirect to homepage after successful deletion
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-red-900/20">
      <CardHeader>
        <CardTitle className="text-red-600">Gefahrenzone</CardTitle>
        <CardDescription>Irreversible Aktionen für dein Konto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Vorsicht</AlertTitle>
          <AlertDescription>
            Diese Aktionen können nicht rückgängig gemacht werden. Bitte sei vorsichtig.
          </AlertDescription>
        </Alert>

        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            onClick={() => {
              setShowDeleteConfirm(true);
              setError(null);
              setConfirmText("");
            }}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Account löschen
          </Button>
        ) : (
          <div className="space-y-4 rounded-lg border border-red-900/20 bg-red-950/10 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Gib <span className="font-bold text-red-600">LÖSCHEN</span> ein um dein Konto zu löschen:
              </p>
              <Input
                placeholder="LÖSCHEN"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              ⚠️ Dies wird dein Konto und alle zugehörigen Daten dauerhaft löschen. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={loading}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={loading || confirmText !== "LÖSCHEN"}
                className="flex-1"
              >
                {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Wird gelöscht..." : "Bestätigen - Account löschen"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
