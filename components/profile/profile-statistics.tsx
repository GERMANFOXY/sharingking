"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Users, Lock, Zap } from "lucide-react";

interface Stats {
  teamCount: number;
  teamMemberCount: number;
  loading: boolean;
  error: string | null;
}

export default function ProfileStatistics({ user }: { user: User }) {
  const [stats, setStats] = useState<Stats>({
    teamCount: 0,
    teamMemberCount: 0,
    loading: true,
    error: null,
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Teams as owner
        const { data: teamsOwned, error: teamsError } = await supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("owner_user_id", user.id);

        // Teams as member
        const { data: teamsMember, error: memberError } = await supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (teamsError || memberError) {
          setStats((prev) => ({
            ...prev,
            error: "Statistiken konnten nicht geladen werden",
            loading: false,
          }));
        } else {
          setStats({
            teamCount: teamsOwned?.length || 0,
            teamMemberCount: (teamsMember?.length || 0) + (teamsOwned?.length || 0),
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        setStats((prev) => ({
          ...prev,
          error: err.message || "Ein Fehler ist aufgetreten",
          loading: false,
        }));
      }
    };

    fetchStats();
  }, [user.id, supabase]);

  const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-primary opacity-20" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account-Statistiken</CardTitle>
          <CardDescription>Übersicht deiner Account-Aktivität</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.error && (
            <Alert variant="destructive">
              <AlertDescription>{stats.error}</AlertDescription>
            </Alert>
          )}

          {!stats.error && (
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                icon={Zap}
                label="Teams (Besitzer)"
                value={stats.loading ? "..." : stats.teamCount}
              />
              <StatCard
                icon={Users}
                label="Teams (Gesamt)"
                value={stats.loading ? "..." : stats.teamMemberCount}
              />
              <StatCard
                icon={Lock}
                label="Sicherheit"
                value={user.email_confirmed_at ? "✓ Verifiziert" : "✗ Ausstehend"}
              />
              <StatCard
                icon={Activity}
                label="Account-Status"
                value="Aktiv"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitätsinformationen</CardTitle>
          <CardDescription>Weitere Details zu deinem Account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Account-Typ</span>
            <span className="text-sm font-medium">Standard</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Authentifizierung</span>
            <span className="text-sm font-medium">{user.user_metadata?.provider || "Email"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Multi-Faktor</span>
            <span className="text-sm font-medium">Nicht aktiviert</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
