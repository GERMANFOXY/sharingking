'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

// Temporary until generated Supabase types include team tables/columns.
const getAdminClient = () => createAdminClient() as any;
const getServerSupabase = async () => (await createServerClient()) as any;

// Types
export interface TeamData {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export interface TeamMember {
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

export interface OperationLog {
  id: string;
  team_id: string;
  performed_by: string;
  operation: string;
  upload_ids: string[];
  priority: string;
  status: string;
  findings_count: number;
  fixes_count: number;
  error_count: number;
  created_at: string;
  duration_ms: number;
  performed_by_email?: string;
}

export interface DashboardStats {
  totalMembers: number;
  totalUploads: number;
  successRate: number;
  topIssues: Array<{ issue: string; count: number }>;
  recentOperations: OperationLog[];
}

// Team Management
export async function createTeam(name: string): Promise<{ team: TeamData | null; error: string | null }> {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) {
    return { team: null, error: 'Nicht authentifiziert' };
  }

  const { data: team, error } = await admin
    .from('teams')
    .insert([{ name, owner_user_id: user.user.id }])
    .select()
    .single();

  if (error) {
    return { team: null, error: error.message || 'Team konnte nicht erstellt werden' };
  }

  // Add owner as member; ignore duplicate membership if already present.
  const { error: memberError } = await admin.from('team_members').upsert([
    { team_id: team.id, user_id: user.user.id, role: 'owner' },
  ], { onConflict: 'team_id,user_id' });

  if (memberError) {
    return { team: null, error: memberError.message || 'Team erstellt, aber Owner-Mitglied konnte nicht gesetzt werden' };
  }

  return { team: team as TeamData, error: null };
}

export async function getTeams(): Promise<{ teams: TeamData[]; error: string | null }> {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) {
    return { teams: [], error: 'Nicht authentifiziert' };
  }

  const { data: ownedTeams, error: ownedError } = await admin
    .from('teams')
    .select('*')
    .eq('owner_user_id', user.user.id);

  if (ownedError) {
    return { teams: [], error: ownedError.message || 'Teams konnten nicht geladen werden' };
  }

  const { data: memberships, error: membershipError } = await admin
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.user.id);

  if (membershipError) {
    return { teams: [], error: membershipError.message || 'Team-Mitgliedschaften konnten nicht geladen werden' };
  }

  const memberTeamIds = Array.from(new Set((memberships || []).map((m: any) => m.team_id)));

  let memberTeams: any[] = [];
  if (memberTeamIds.length > 0) {
    const { data, error } = await admin.from('teams').select('*').in('id', memberTeamIds);
    if (error) {
      return { teams: [], error: error.message || 'Mitglieder-Teams konnten nicht geladen werden' };
    }
    memberTeams = data || [];
  }

  const teamMap = new Map<string, TeamData>();
  for (const team of [...(ownedTeams || []), ...memberTeams]) {
    teamMap.set(team.id, team as TeamData);
  }

  return { teams: Array.from(teamMap.values()), error: null };
}

export async function getTeamDetails(teamId: string) {
  const admin = getAdminClient();
  const { data: team, error } = await admin
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) throw new Error(error.message || 'Team konnte nicht geladen werden');
  return team as TeamData;
}

// Team Members
export async function getTeamMembers(teamId: string) {
  const admin = getAdminClient();

  const { data: members, error } = await admin
    .from('team_members')
    .select('*')
    .eq('team_id', teamId);

  if (error) throw new Error(error.message || 'Mitglieder konnten nicht geladen werden');

  const userIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, email, display_name').in('id', userIds)
    : { data: [] as any[] };

  const profileMap = new Map<string, { email: string; display_name?: string | null }>();
  for (const profile of profiles || []) {
    profileMap.set((profile as any).id, {
      email: (profile as any).email,
      display_name: (profile as any).display_name,
    });
  }

  return (members || []).map((member: any) => ({
    ...member,
    user: {
      email: profileMap.get(member.user_id)?.email || '',
      user_metadata: {
        full_name: profileMap.get(member.user_id)?.display_name || undefined,
      },
    },
  })) as TeamMember[];
}

export async function addTeamMember(teamId: string, userEmail: string) {
  const admin = getAdminClient();

  // Find user by email
  const { data: users, error: userError } = await admin.auth.admin.listUsers();
  if (userError) throw userError;

  const targetUser = users.users.find((u: any) => u.email === userEmail);
  if (!targetUser) throw new Error(`User with email ${userEmail} not found`);

  // Check if already member
  const { data: existing } = await admin
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', targetUser.id)
    .single();

  if (existing) throw new Error('User is already a team member');

  // Add member
  const { data: member, error } = await admin
    .from('team_members')
    .insert([
      { team_id: teamId, user_id: targetUser.id, role: 'member' },
    ])
    .select()
    .single();

  if (error) throw error;
  return member;
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: user } = await supabase.auth.getUser();

  // Verify caller is owner
  const { data: team } = await admin
    .from('teams')
    .select('owner_user_id')
    .eq('id', teamId)
    .single();

  if (team?.owner_user_id !== user?.user?.id) {
    throw new Error('Only owner can remove members');
  }

  const { error } = await admin
    .from('team_members')
    .delete()
    .eq('id', memberId)
    .eq('team_id', teamId);

  if (error) throw error;
}

// Operation Logging
export async function logOperation(
  teamId: string,
  operation: string,
  uploadIds: string[],
  priority: string,
  status: string,
  auditData: any,
  durationMs: number,
) {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('Not authenticated');

  const findings = auditData.findings?.length || 0;
  const fixes = auditData.fixesApplied?.length || 0;
  const errors = auditData.entries?.filter((e: any) => e.status === 'error').length || 0;

  const { data: log, error } = await admin
    .from('operation_logs')
    .insert([
      {
        team_id: teamId,
        performed_by: user.user.id,
        operation,
        upload_ids: uploadIds,
        priority,
        status: status === 'success' ? 'success' : errors > 0 ? 'partial' : 'failed',
        findings_count: findings,
        fixes_count: fixes,
        error_count: errors,
        audit_data: auditData,
        duration_ms: durationMs,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message || 'Operation konnte nicht geloggt werden');
  return log as OperationLog;
}

// Dashboard Stats
export async function getDashboardStats(teamId: string): Promise<DashboardStats> {
  const admin = getAdminClient();

  // Get members count
  const { count: memberCount } = await admin
    .from('team_members')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId);

  // Get uploads count
  const { count: uploadCount } = await admin
    .from('uploads')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId);

  // Get success rate from operation logs
  const { data: logs } = await admin
    .from('operation_logs')
    .select('status')
    .eq('team_id', teamId)
    .limit(100);

  const successCount = logs?.filter((l: any) => l.status === 'success').length || 0;
  const successRate = logs && logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  // Get top issues
  const { data: allLogs } = await admin
    .from('operation_logs')
    .select('operation, findings_count')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50);

  const issueCounts: Record<string, number> = {};
  allLogs?.forEach((log: any) => {
    issueCounts[log.operation] = (issueCounts[log.operation] || 0) + (log.findings_count || 0);
  });

  const topIssues = Object.entries(issueCounts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get recent operations
  const { data: recentOps } = await admin
    .from('operation_logs')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(10);

  const recentOperations = (recentOps || []).map((op: any) => ({ ...op }));

  return {
    totalMembers: memberCount || 0,
    totalUploads: uploadCount || 0,
    successRate,
    topIssues,
    recentOperations: recentOperations as OperationLog[],
  };
}

// Get operation history
export async function getOperationHistory(teamId: string, limit = 50) {
  const admin = getAdminClient();

  const { data: logs, error } = await admin
    .from('operation_logs')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Operationen konnten nicht geladen werden');

  return (logs || []).map((op: any) => ({ ...op })) as OperationLog[];
}

// Change role of a team member (owner only; cannot change own role or other owners)
export async function changeTeamMemberRole(teamId: string, memberId: string, newRole: 'member' | 'admin') {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const callerId = authData?.user?.id;
  if (!callerId) throw new Error('Nicht authentifiziert');

  const { data: team } = await admin
    .from('teams')
    .select('owner_user_id')
    .eq('id', teamId)
    .single();

  if (team?.owner_user_id !== callerId) {
    throw new Error('Nur der Owner kann Rollen ändern');
  }

  // Prevent changing roles of owner members
  const { data: target } = await admin
    .from('team_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .single();

  if (!target) throw new Error('Mitglied nicht gefunden');
  if (target.role === 'owner' || target.user_id === callerId) {
    throw new Error('Owner-Rolle kann nicht geändert werden');
  }

  const { error } = await admin
    .from('team_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('team_id', teamId);

  if (error) throw new Error(error.message || 'Rolle konnte nicht geändert werden');
}

// Rename a team (owner only)
export async function renameTeam(teamId: string, newName: string) {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const callerId = authData?.user?.id;
  if (!callerId) throw new Error('Nicht authentifiziert');

  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Team-Name darf nicht leer sein');
  if (trimmed.length > 80) throw new Error('Name darf maximal 80 Zeichen enthalten');

  const { data: team } = await admin
    .from('teams')
    .select('owner_user_id')
    .eq('id', teamId)
    .single();

  if (team?.owner_user_id !== callerId) {
    throw new Error('Nur der Owner kann das Team umbenennen');
  }

  const { error } = await admin
    .from('teams')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', teamId);

  if (error) throw new Error(error.message || 'Team konnte nicht umbenannt werden');
}

// Delete an entire team (owner only)
export async function deleteTeam(teamId: string) {
  const admin = getAdminClient();
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const callerId = authData?.user?.id;
  if (!callerId) throw new Error('Nicht authentifiziert');

  const { data: team } = await admin
    .from('teams')
    .select('owner_user_id')
    .eq('id', teamId)
    .single();

  if (team?.owner_user_id !== callerId) {
    throw new Error('Nur der Owner kann das Team löschen');
  }

  const { error } = await admin
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw new Error(error.message || 'Team konnte nicht gelöscht werden');
}

