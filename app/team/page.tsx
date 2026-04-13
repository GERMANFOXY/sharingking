'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeam, getTeams } from '@/app/actions/team-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Team {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export default function TeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    try {
      const { teams: data, error: loadError } = await getTeams();
      if (loadError) {
        setError(loadError);
        setTeams([]);
        return;
      }
      setTeams(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler beim Laden der Teams';
      if (message.includes('Not authenticated')) {
        setError('Bitte melde dich an, um Teams zu verwalten');
      } else {
        console.error('Failed to load teams:', error);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName) return;

    setCreating(true);
    setError('');

    try {
      const { team: newTeam, error: createError } = await createTeam(teamName);
      if (createError || !newTeam) {
        setError(createError || 'Fehler beim Erstellen des Teams');
        setCreating(false);
        return;
      }
      setTeamName('');
      router.push(`/team/${newTeam.id}/dashboard`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Erstellen des Teams');
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Support Team Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Verwalte dein Support Team und überwache Self-Help Operationen
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Create new team */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Neues Team erstellen</CardTitle>
              <CardDescription>Starten Sie ein neues Support Team</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <Input
                  placeholder="Team-Name"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  disabled={creating}
                />
                <Button type="submit" className="w-full" disabled={creating || !teamName}>
                  {creating ? 'Wird erstellt...' : 'Team erstellen'}
                </Button>
              </form>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Meine Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {teams.length === 1 ? 'Team' : 'Teams'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Schnellzugriff</CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/team/${teams[0].id}/dashboard`)}
                >
                  Zum ersten Team
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Teams</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Teams Grid */}
        {teams.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Deine Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(team => (
                <Card
                  key={team.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/team/${team.id}/dashboard`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.name}</span>
                      <span className="text-2xl">👥</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Erstellt: {new Date(team.created_at).toLocaleDateString('de-DE')}
                    </p>
                    <Button className="w-full mt-4">
                      Zum Dashboard →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {teams.length === 0 && (
          <Card className="text-center py-12">
            <CardContent className="text-muted-foreground">
              <p className="text-lg mb-4">📭 Noch keine Teams vorhanden</p>
              <p className="text-sm">Erstelle dein erstes Team oben, um zu starten</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
