import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';

interface TeamRootLayoutProps {
  children: React.ReactNode;
}

export default async function TeamRootLayout({ children }: TeamRootLayoutProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: memberRow }, { data: ownerRow }] = await Promise.all([
    supabase.from('team_members').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
    supabase.from('teams').select('id').eq('owner_user_id', user.id).limit(1).maybeSingle(),
  ]);

  if (!memberRow && !ownerRow) {
    redirect('/');
  }

  return <>{children}</>;
}