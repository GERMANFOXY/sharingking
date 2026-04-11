-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create operation_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  operation TEXT NOT NULL, -- 'diagnose', 'repair', 'deep_repair', etc.
  upload_ids TEXT[], -- JSON array of processed IDs
  priority TEXT DEFAULT 'quick',
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'partial', 'failed'
  findings_count INT DEFAULT 0,
  fixes_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  audit_data JSONB, -- Full audit JSON
  created_at TIMESTAMP DEFAULT NOW(),
  duration_ms INT
);

-- Add team_id to uploads table if not exists
ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_team_id ON public.operation_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON public.operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_team_id ON public.uploads(team_id);

-- RLS: Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their teams" ON public.teams
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.team_members WHERE team_id = teams.id
      UNION
      SELECT owner_user_id FROM public.teams t WHERE t.id = teams.id
    )
  );

CREATE POLICY "Only owner can update team" ON public.teams
  FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "Only owner can delete team" ON public.teams
  FOR DELETE USING (owner_user_id = auth.uid());

-- RLS: Team Members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view team roster" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM public.teams WHERE 
        owner_user_id = auth.uid() 
        OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Only owner can manage members" ON public.team_members
  FOR ALL USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_user_id = auth.uid()
    )
  );

-- RLS: Operation Logs
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view operation logs" ON public.operation_logs
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM public.teams WHERE 
        owner_user_id = auth.uid() 
        OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can create operation logs" ON public.operation_logs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE 
        owner_user_id = auth.uid() 
        OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );
