import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    teamId: string;
  }>;
}

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { teamId } = await params;

  const [{ data: memberRow }, { data: ownerRow }] = await Promise.all([
    supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('owner_user_id', user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!memberRow && !ownerRow) {
    redirect('/team');
  }

  const navItems = [
    { href: `/team/${teamId}/dashboard`, label: 'Dashboard', icon: '📊' },
    { href: `/team/${teamId}/members`, label: 'Team-Mitglieder', icon: '👥' },
    { href: `/team/${teamId}/operations`, label: 'Operationen', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold">Support Team</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card px-4 py-6">
          <nav className="space-y-2">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-4 py-3 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
