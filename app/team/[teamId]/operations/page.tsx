'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getOperationHistory } from '@/app/actions/team-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OperationLog {
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
  audit_data?: any;
}

function getOperationIcon(operation: string): string {
  const icons: Record<string, string> = {
    diagnose: '🔍',
    repair: '🔧',
    deep_repair: '🛠️',
    privacy_lock: '🔒',
    refresh_access: '🔄',
    purge_expired_owned: '🗑️',
  };
  return icons[operation] || '📋';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-blue-100 text-blue-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export default function OperationsPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [operations, setOperations] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOp, setSelectedOp] = useState<OperationLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function loadOps() {
      try {
        const data = await getOperationHistory(teamId, 100);
        setOperations(data || []);
      } catch (error) {
        console.error('Failed to load operations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOps();
  }, [teamId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Operation Audit-Log</h1>
        <p className="text-muted-foreground">
          Alle durchgeführten Self-Help Operationen des Teams
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Insgesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Erfolgreich</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {operations.filter(o => o.status === 'success').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Teilweise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {operations.filter(o => o.status === 'partial').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fehler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {operations.filter(o => o.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Operation History</CardTitle>
          <CardDescription>Alle durchgeführten Operationen im Team</CardDescription>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Keine Operationen durchgeführt</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Operation</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Priorität</th>
                    <th className="text-center py-3 px-4 font-medium">IDs</th>
                    <th className="text-center py-3 px-4 font-medium">✅ Fixes</th>
                    <th className="text-center py-3 px-4 font-medium">❌ Fehler</th>
                    <th className="text-center py-3 px-4 font-medium">⏱️ Zeit</th>
                    <th className="text-left py-3 px-4 font-medium">Von</th>
                    <th className="text-left py-3 px-4 font-medium">Datum</th>
                    <th className="text-right py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map(op => (
                    <tr key={op.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">
                        <span className="mr-2">{getOperationIcon(op.operation)}</span>
                        {op.operation}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(op.status)}`}
                        >
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize">{op.priority}</td>
                      <td className="py-3 px-4 text-center text-sm">
                        {op.upload_ids?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-green-600 font-medium">
                        {op.fixes_count}
                      </td>
                      <td className="py-3 px-4 text-center text-red-600 font-medium">
                        {op.error_count}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                        {op.duration_ms}ms
                      </td>
                      <td className="py-3 px-4 text-sm">{op.performed_by_email}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(op.created_at).toLocaleDateString('de-DE')}
                        <br />
                        <span className="text-xs">
                          {new Date(op.created_at).toLocaleTimeString('de-DE')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOp(op);
                            setShowDetails(!showDetails);
                          }}
                        >
                          {showDetails && selectedOp?.id === op.id ? '✕' : 'Details'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Panel */}
      {showDetails && selectedOp && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Details</CardTitle>
            <CardDescription>{selectedOp.operation} - {selectedOp.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Operation</p>
                <p className="font-medium">{selectedOp.operation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{selectedOp.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priorität</p>
                <p className="font-medium capitalize">{selectedOp.priority}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dauer</p>
                <p className="font-medium">{selectedOp.duration_ms}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durchgeführt von</p>
                <p className="font-medium">{selectedOp.performed_by_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Datum</p>
                <p className="font-medium">
                  {new Date(selectedOp.created_at).toLocaleString('de-DE')}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Upload IDs</p>
              <div className="bg-muted p-3 rounded max-h-32 overflow-auto font-mono text-sm">
                {selectedOp.upload_ids?.join(', ') || 'Keine'}
              </div>
            </div>

            {selectedOp.audit_data && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Audit Data (JSON)</p>
                <div className="bg-muted p-3 rounded max-h-48 overflow-auto font-mono text-xs">
                  <pre>{JSON.stringify(selectedOp.audit_data, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
