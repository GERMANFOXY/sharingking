import { UploadRowActions } from "@/components/dashboard/upload-row-actions";
import Link from "next/link";

import type { UserUploadListItem } from "@/lib/types/app";
import { formatBytes, formatDateTime, formatRemainingLifetime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UploadsTableShellProps = {
  uploads: UserUploadListItem[];
  nextLimit: number | null;
};

export function UploadsTableShell({ uploads, nextLimit }: UploadsTableShellProps) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Upload-Uebersicht</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">Links kopieren, manuell loeschen und Restlaufzeit direkt in einer Ansicht.</p>
        </div>
        <Button asChild>
          <Link href="/">Neuer Upload</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Datei</th>
                <th className="px-4 py-3 font-medium">Typ</th>
                <th className="px-4 py-3 font-medium">Groesse</th>
                <th className="px-4 py-3 font-medium">Hochgeladen</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ablauf</th>
                <th className="px-4 py-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {uploads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Noch keine Uploads vorhanden.
                  </td>
                </tr>
              ) : (
                uploads.map((upload) => (
                  <tr key={upload.id} className="bg-black/10 transition-colors hover:bg-black/20">
                    <td className="px-4 py-4 text-white">
                      <div className="max-w-xs truncate">{upload.original_name}</div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{upload.kind === "image" ? "Bild" : "Datei"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{formatBytes(upload.size_bytes)}</td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDateTime(upload.created_at)}</td>
                    <td className="px-4 py-4">
                      <Badge variant={upload.status === "active" ? "default" : "secondary"}>{upload.status}</Badge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <div>{formatDateTime(upload.expires_at)}</div>
                      <div className="mt-1 text-xs text-muted-foreground/80">{formatRemainingLifetime(upload.expires_at)}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <UploadRowActions uploadId={upload.id} sharePath={upload.kind === "image" ? `/i/${upload.public_id}` : `/f/${upload.public_id}`} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-4 md:hidden">
          {uploads.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-muted-foreground">
              Noch keine Uploads vorhanden.
            </div>
          ) : (
            uploads.map((upload) => (
              <div key={upload.id} className="rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors hover:bg-black/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{upload.original_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{upload.kind === "image" ? "Bild" : "Datei"} · {formatBytes(upload.size_bytes)}</p>
                  </div>
                  <Badge variant={upload.status === "active" ? "default" : "secondary"}>{upload.status}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  <div>Hochgeladen: {formatDateTime(upload.created_at)}</div>
                  <div>Ablauf: {formatDateTime(upload.expires_at)}</div>
                  <div>{formatRemainingLifetime(upload.expires_at)}</div>
                </div>
                <div className="mt-4">
                  <UploadRowActions uploadId={upload.id} sharePath={upload.kind === "image" ? `/i/${upload.public_id}` : `/f/${upload.public_id}`} />
                </div>
              </div>
            ))
          )}
        </div>
        {nextLimit ? (
          <div className="mt-6 flex justify-center">
            <Button asChild variant="secondary">
              <Link href={`/dashboard?limit=${nextLimit}`}>Mehr laden</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}