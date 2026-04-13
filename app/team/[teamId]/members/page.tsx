'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Pencil, Shield, ShieldCheck, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import {
  getTeamDetails,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  changeTeamMemberRole,
  renameTeam,
  deleteTeam,
  listRegularUsers,
  addRegularUserToTeam,
  type RegularUserOption,
} from '@/app/actions/team-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Mitglied',
};

const ROLE_BADGE: Record<string, 'default' | 'secondary'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'secondary',
};

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const [regularUsers, setRegularUsers] = useState<RegularUserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [regularLoading, setRegularLoading] = useState(false);
  const [addingRegularId, setAddingRegularId] = useState<string | null>(null);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAll();
  }, [teamId]);

  function flash(msg: string, isError = false) {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 4000);
  }

  async function loadRegularUsers() {
    setRegularLoading(true);
    try {
      const users = await listRegularUsers(teamId, userSearch);
      setRegularUsers(users);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Regulaere Nutzer konnten nicht geladen werden', true);
    } finally {
      setRegularLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [details, data] = await Promise.all([getTeamDetails(teamId), getTeamMembers(teamId)]);
      setTeamName(details.name);
      setMembers(data || []);
      await loadRegularUsers();
    } catch {
      setError('Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setAdding(true);
    try {
      await addTeamMember(teamId, email);
      flash(`${email} wurde hinzugefuegt`);
      setEmail('');
      await loadAll();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Fehler beim Hinzufuegen', true);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberEmail: string) {
    try {
      await removeTeamMember(teamId, memberId);
      flash(`${memberEmail} wurde entfernt`);
      setConfirmRemoveId(null);
      await loadAll();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Fehler beim Entfernen', true);
    }
  }

  async function handleChangeRole(memberId: string, newRole: 'member' | 'admin') {
    setRoleChangingId(memberId);
    try {
      await changeTeamMemberRole(teamId, memberId, newRole);
      flash('Rolle geaendert');
      await loadAll();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Fehler beim Rollenaendern', true);
    } finally {
      setRoleChangingId(null);
    }
  }

  async function handleRenameTeam(e: React.FormEvent) {
    e.preventDefault();
    setRenameBusy(true);
    try {
      await renameTeam(teamId, renameValue);
      setTeamName(renameValue.trim());
      setRenaming(false);
      flash('Team umbenannt');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Fehler beim Umbenennen', true);
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleDeleteTeam() {
    setDeleteBusy(true);
    try {
      await deleteTeam(teamId);
      router.push('/team');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Fehler beim Loeschen', true);
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddRegularUser(userId: string, role: 'member' | 'admin') {
    setAddingRegularId(`${userId}:${role}`);
    try {
      await addRegularUserToTeam(teamId, userId, role);
      flash(role === 'admin' ? 'Nutzer als Admin hinzugefuegt' : 'Nutzer als Mitglied hinzugefuegt');
      await Promise.all([loadAll(), loadRegularUsers()]);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Nutzer konnte nicht hinzugefuegt werden', true);
    } finally {
      setAddingRegularId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-muted rounded-lg" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <form onSubmit={handleRenameTeam} className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={80}
                autoFocus
                className="h-10 w-64 text-xl font-bold"
              />
              <Button type="submit" size="sm" disabled={renameBusy || !renameValue.trim()}>
                <Check className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{teamName}</h1>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRenameValue(teamName);
                  setRenaming(true);
                }}
                title="Team umbenennen"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-muted-foreground mt-1">
            Nutzer-Verwaltung - {members.length} Mitglied{members.length !== 1 ? 'er' : ''}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{success}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Mitglied hinzufuegen
          </CardTitle>
          <CardDescription>E-Mail-Adresse eines registrierten Nutzers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMember} className="flex gap-2">
            <Input
              type="email"
              placeholder="nutzer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={adding}
              className="max-w-sm"
            />
            <Button type="submit" disabled={adding || !email}>
              {adding ? 'Wird hinzugefuegt...' : 'Hinzufuegen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Regulaere Nutzer verwalten
          </CardTitle>
          <CardDescription>
            Registrierte Nutzer, die noch nicht im Team sind. Du kannst sie direkt als Mitglied oder Admin hinzufuegen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await loadRegularUsers();
            }}
            className="flex gap-2"
          >
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Suche nach E-Mail oder Name"
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary" disabled={regularLoading}>
              {regularLoading ? 'Suche...' : 'Suchen'}
            </Button>
          </form>

          {regularLoading ? (
            <div className="text-sm text-muted-foreground">Nutzer werden geladen...</div>
          ) : regularUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine passenden regulaeren Nutzer gefunden.</div>
          ) : (
            <div className="space-y-2">
              {regularUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{u.email}</div>
                    {u.display_name ? <div className="truncate text-xs text-muted-foreground">{u.display_name}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={addingRegularId !== null}
                      onClick={() => handleAddRegularUser(u.id, 'member')}
                    >
                      {addingRegularId === `${u.id}:member` ? '...' : 'Als Mitglied'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={addingRegularId !== null}
                      onClick={() => handleAddRegularUser(u.id, 'admin')}
                    >
                      {addingRegularId === `${u.id}:admin` ? '...' : 'Als Admin'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mitglieder ({members.length})</CardTitle>
          <CardDescription>Rollen, Beitrittsdatum und Aktionen pro Mitglied</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="px-6 py-10 text-center text-muted-foreground">Noch keine Mitglieder</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Nutzer</th>
                    <th className="px-6 py-3 font-medium">Rolle</th>
                    <th className="px-6 py-3 font-medium">Beigetreten</th>
                    <th className="px-6 py-3 font-medium text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {members.map((member) => (
                    <tr key={member.id} className="bg-black/10 transition-colors hover:bg-black/20">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{member.user?.email || '-'}</div>
                        {member.user?.user_metadata?.full_name && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{member.user.user_metadata.full_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={ROLE_BADGE[member.role] ?? 'secondary'}>
                          {member.role === 'owner' && <ShieldCheck className="mr-1 h-3 w-3" />}
                          {member.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(member.joined_at).toLocaleDateString('de-DE')}</td>
                      <td className="px-6 py-4 text-right">
                        {member.role !== 'owner' && (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {confirmRemoveId !== member.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={roleChangingId === member.id}
                                onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'member' : 'admin')}
                                title={member.role === 'admin' ? 'Zu Mitglied herabstufen' : 'Zum Admin befoerdern'}
                              >
                                {roleChangingId === member.id ? (
                                  <span className="text-xs text-muted-foreground">...</span>
                                ) : member.role === 'admin' ? (
                                  <>
                                    <Shield className="mr-1.5 h-3.5 w-3.5" />
                                    Zu Mitglied
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                    Zum Admin
                                  </>
                                )}
                              </Button>
                            )}
                            {confirmRemoveId === member.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Wirklich entfernen?</span>
                                <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(member.id, member.user?.email ?? '')}>
                                  Ja
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setConfirmRemoveId(null)}>
                                  Nein
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => setConfirmRemoveId(member.id)}>
                                <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                                Entfernen
                              </Button>
                            )}
                          </div>
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

      <Card className="border-red-900/40 bg-red-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Aktionen, die nicht rueckgaengig gemacht werden koennen</CardDescription>
        </CardHeader>
        <CardContent>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-red-300">Das Team und alle Mitgliedschaften werden geloescht. Wirklich fortfahren?</span>
              <Button variant="destructive" size="sm" disabled={deleteBusy} onClick={handleDeleteTeam}>
                {deleteBusy ? 'Wird geloescht...' : 'Ja, Team loeschen'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Team loeschen
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}