'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getDashboardStats } from '@/app/actions/team-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalMembers: number;
  totalUploads: number;
  successRate: number;
  topIssues: Array<{ issue: string; count: number }>;
  recentOperations: Array<{
    id: string;
    operation: string;
    status: string;
    findings_count: number;
    fixes_count: number;
    error_count: number;
    created_at: string;
    performed_by_email?: string;
  }>;
}

export default function DashboardPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats(teamId);
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [teamId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground">Keine Daten verfügbar</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Team Dashboard</h1>
        <p className="text-muted-foreground">Übersicht deines Support Teams</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Team-Mitglieder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Uploads (Team)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUploads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Erfolgsquote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Operationen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentOperations.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Top Probleme</CardTitle>
            <CardDescription>Häufigste Probleme in den letzten Operationen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topIssues.length > 0 ? (
                stats.topIssues.map((issue, i) => (
                  <div key={i} className="flex items-center justify-between pb-2 border-b last:border-0">
                    <span className="text-sm capitalize">{issue.issue}</span>
                    <span className="text-sm font-medium bg-accent px-2 py-1 rounded">
                      {issue.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Probleme erfasst</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Operationen</CardTitle>
            <CardDescription>Zuletzt durchgeführte Selbsthilfe-Operationen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentOperations.length > 0 ? (
                stats.recentOperations.slice(0, 5).map(op => (
                  <div key={op.id} className="pb-3 border-b last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{op.operation}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          op.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : op.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {op.status}
                      </span>
                    </div>
                    <div className="flex text-xs text-muted-foreground justify-between">
                      <span>
                        ✅ {op.fixes_count} Behobene | ❌ {op.error_count} Fehler
                      </span>
                      <span>{new Date(op.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Operationen durchgeführt</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
          <CardDescription>Häufig benötigte Funktionen</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <a
            href={`/team/${teamId}/members`}
            className="p-4 border rounded-lg hover:bg-accent transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-sm">Team-Mitglieder</div>
            <div className="text-xs text-muted-foreground">Verwalten</div>
          </a>
          <a
            href={`/team/${teamId}/operations`}
            className="p-4 border rounded-lg hover:bg-accent transition-colors text-center"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium text-sm">Operationen</div>
            <div className="text-xs text-muted-foreground">Audit-Log</div>
          </a>
          <a
            href="/hilfe-support"
            className="p-4 border rounded-lg hover:bg-accent transition-colors text-center"
          >
            <div className="text-2xl mb-2">🔧</div>
            <div className="font-medium text-sm">Self-Help</div>
            <div className="text-xs text-muted-foreground">Diagn. Tool</div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
