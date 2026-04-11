'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from '@/app/actions/team-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: {
    email: string;
    user_metadata?: { full_name?: string };
  };
}

export default function MembersPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMembers();
  }, [teamId]);

  async function loadMembers() {
    try {
      const data = await getTeamMembers(teamId);
      setMembers(data || []);
    } catch (error) {
      console.error('Failed to load members:', error);
      setError('Mitglieder konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await addTeamMember(teamId, email);
      setSuccess(`${email} wurde zum Team hinzugefügt`);
      setEmail('');
      await loadMembers();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Hinzufügen');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Dieses Mitglied wirklich entfernen?')) return;

    try {
      await removeTeamMember(teamId, memberId);
      setSuccess('Mitglied entfernt');
      await loadMembers();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Entfernen');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-muted rounded-lg" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Team-Mitglieder</h1>
        <p className="text-muted-foreground">Verwalte dein Support Team</p>
      </div>

      {/* Add Member Form */}
      <Card>
        <CardHeader>
          <CardTitle>Mitglied hinzufügen</CardTitle>
          <CardDescription>Email-Adresse eines neuen Team-Mitglieds</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMember} className="flex gap-2">
            <Input
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={adding}
            />
            <Button type="submit" disabled={adding || !email}>
              {adding ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </Button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-2">✅ {success}</p>}
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Mitglieder ({members.length})</CardTitle>
          <CardDescription>Alle Team-Mitglieder und deren Rollen</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Noch keine Mitglieder</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Rolle</th>
                    <th className="text-left py-3 px-4 font-medium">Beigetreten</th>
                    <th className="text-right py-3 px-4">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{member.user?.email}</td>
                      <td className="py-3 px-4">
                        {member.user?.user_metadata?.full_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-accent rounded text-sm">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(member.joined_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {member.role !== 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Entfernen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
