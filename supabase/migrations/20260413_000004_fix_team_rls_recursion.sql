CREATE OR REPLACE FUNCTION public.can_access_team(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_team(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_team(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Only owner can update team" ON public.teams;
DROP POLICY IF EXISTS "Only owner can delete team" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

CREATE POLICY "Users can view their teams" ON public.teams
  FOR SELECT USING (public.can_access_team(id));

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Only owner can update team" ON public.teams
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Only owner can delete team" ON public.teams
  FOR DELETE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Team members can view team roster" ON public.team_members;
DROP POLICY IF EXISTS "Only owner can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Only owner can insert members" ON public.team_members;
DROP POLICY IF EXISTS "Only owner can update members" ON public.team_members;
DROP POLICY IF EXISTS "Only owner can delete members" ON public.team_members;

CREATE POLICY "Team members can view team roster" ON public.team_members
  FOR SELECT USING (public.can_access_team(team_id));

CREATE POLICY "Only owner can insert members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Only owner can update members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Only owner can delete members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can view operation logs" ON public.operation_logs;
DROP POLICY IF EXISTS "Team members can create operation logs" ON public.operation_logs;

CREATE POLICY "Team members can view operation logs" ON public.operation_logs
  FOR SELECT USING (public.can_access_team(team_id));

CREATE POLICY "Team members can create operation logs" ON public.operation_logs
  FOR INSERT WITH CHECK (public.can_access_team(team_id));