"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Copy, LoaderCircle, UploadCloud, XCircle } from "lucide-react";

import { completeUploadsAction, prepareUploadsAction } from "@/app/actions/upload-actions";
import { APP_LIMITS } from "@/lib/constants";
import type { CompletedUploadLink, PreparedUpload, UploadDraft, UploadMode } from "@/lib/types/upload";
import { cn, formatBytes, formatUploadErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type UploadItemState = {
  clientId: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "processing" | "completed" | "failed";
  error?: string;
  sharePath?: string;
};

type HeroUploadClientProps = {
  isAuthenticated: boolean;
};

function createClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function toDraft(item: UploadItemState, isPublic: boolean): UploadDraft {
  return {
    clientId: item.clientId,
    name: item.file.name,
    size: item.file.size,
    type: item.file.type,
    isPublic,
  };
}

function uploadWithProgress(file: File, prepared: PreparedUpload, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", prepared.signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(event.loaded, file.size));
      }
    };
    xhr.onerror = () => reject(new Error(`Upload fehlgeschlagen: ${prepared.name}`));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
        return;
      }

      reject(new Error(`Upload fehlgeschlagen: ${prepared.name}`));
    };
    xhr.send(file);
  });
}

export function HeroUploadClient({ isAuthenticated }: HeroUploadClientProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadItemState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<CompletedUploadLink[]>([]);
  const [uploadMode, setUploadMode] = useState<UploadMode>(isAuthenticated ? "registered" : "anonymous");
  const pendingItems = useMemo(
    () => items.filter((item) => item.status === "queued" || item.status === "failed"),
    [items],
  );

  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + item.file.size, 0), [items]);
  const uploadedBytes = useMemo(
    () => items.reduce((sum, item) => sum + item.file.size * (item.progress / 100), 0),
    [items],
  );
  const progressValue = totalBytes === 0 ? 0 : Math.min(Math.round((uploadedBytes / totalBytes) * 100), 100);

  function updateItem(clientId: string, updater: (current: UploadItemState) => UploadItemState) {
    setItems((current) => current.map((item) => (item.clientId === clientId ? updater(item) : item)));
  }

  function appendFiles(fileList: FileList | File[]) {
    const nextItems = Array.from(fileList).map((file) => ({
      clientId: createClientId(),
      file,
      progress: 0,
      status: "queued" as const,
    }));

    setItems((current) => [...current, ...nextItems]);
    setBatchError(null);
  }

  async function handleUpload() {
    if (pendingItems.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setBatchError(null);
    setShareLinks([]);

    const drafts = pendingItems.map((item) => toDraft(item, isAuthenticated));
    const prepared = await prepareUploadsAction(drafts);

    if (!prepared.ok) {
      setBatchError(formatUploadErrorMessage(prepared.message));
      setIsSubmitting(false);
      return;
    }

    setUploadMode(prepared.mode);

    const preparedById = new Map(prepared.uploads.map((upload) => [upload.clientId, upload]));

    const uploadResults = await Promise.allSettled(
      pendingItems.map(async (item) => {
        const nextPrepared = preparedById.get(item.clientId);

        if (!nextPrepared) {
          throw new Error(`Upload-Vorbereitung fehlt fuer ${item.file.name}.`);
        }

        updateItem(item.clientId, (current) => ({ ...current, status: "uploading", error: undefined }));

        await uploadWithProgress(item.file, nextPrepared, (loaded) => {
          const nextProgress = Math.min(Math.round((loaded / item.file.size) * 100), 100);

          updateItem(item.clientId, (current) => ({ ...current, progress: nextProgress, status: "uploading" }));
        });

        updateItem(item.clientId, (current) => ({ ...current, progress: 100, status: "processing" }));

        return nextPrepared;
      }),
    );

    const successfulUploads = uploadResults
      .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
      .map((item) => ({
        clientId: item.clientId,
        name: item.name,
        size: item.size,
        mimeType: item.mimeType,
        extension: item.extension,
        kind: item.kind,
        bucketId: item.bucketId,
        storagePath: item.storagePath,
        isPublic: item.isPublic,
      }));

    uploadResults.forEach((result, index) => {
      if (result.status === "rejected") {
        updateItem(pendingItems[index]!.clientId, (current) => ({
          ...current,
          status: "failed",
          error: formatUploadErrorMessage(
            result.reason instanceof Error ? result.reason.message : "Upload fehlgeschlagen.",
          ),
        }));
      }
    });

    if (successfulUploads.length === 0) {
      setBatchError("Kein Upload konnte erfolgreich uebertragen werden.");
      setIsSubmitting(false);
      return;
    }

    const completed = await completeUploadsAction(successfulUploads);

    if (!completed.ok) {
      setBatchError(formatUploadErrorMessage(completed.message));
      setIsSubmitting(false);
      return;
    }

    const linksByClientId = new Map(completed.links.map((link) => [link.clientId, link.sharePath]));

    setItems((current) =>
      current.map((item) => ({
        ...item,
        status: successfulUploads.some((upload) => upload.clientId === item.clientId)
          ? "completed"
          : item.status,
        sharePath: linksByClientId.get(item.clientId),
      })),
    );

    setShareLinks(completed.links);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-white/5 shadow-ambient backdrop-blur-2xl animate-floatIn">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            appendFiles(event.dataTransfer.files);
          }}
          className={cn(
            "rounded-[1.75rem] border border-dashed bg-black/10 p-8 text-center transition-all duration-300",
            isDragging ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(42,225,194,0.3)]" : "border-primary/30 hover:border-primary/50 hover:bg-white/[0.07]",
          )}
        >
          <label htmlFor="hero-upload-input" className="sr-only">
            Dateien fuer den Upload auswaehlen
          </label>
          <input
            id="hero-upload-input"
            ref={inputRef}
            type="file"
            multiple
            aria-label="Dateien fuer den Upload auswaehlen"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                appendFiles(event.target.files);
                event.target.value = "";
              }
            }}
          />
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Dateien hier ablegen</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Drag and Drop oder Klick. Mehrere Dateien werden parallel hochgeladen. Der Upload wird serverseitig
            vorbereitet und danach direkt in Supabase Storage uebertragen.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="min-w-40" onClick={() => inputRef.current?.click()}>
              Dateien waehlen
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="min-w-40"
              onClick={() => {
                void handleUpload();
              }}
              disabled={pendingItems.length === 0 || isSubmitting}
            >
              {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload starten
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            <Badge>{uploadMode === "registered" ? "Registrierter Modus" : "Anonymer Modus"}</Badge>
            <Badge variant="secondary">{items.length} Datei(en)</Badge>
            <Badge variant="secondary">{pendingItems.length} bereit</Badge>
            <Badge variant="secondary">{formatBytes(totalBytes)}</Badge>
          </div>
          <span>{isAuthenticated ? "Uploads werden standardmaessig mit Share-Link angelegt." : "Anonyme Uploads sind privat und nur fuer den urspruenglichen Uploader abrufbar."}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-white">Upload-Fortschritt</span>
            <span className="text-muted-foreground">{progressValue}%</span>
          </div>
          <Progress value={progressValue} />
          <p className="mt-3 text-xs text-muted-foreground">
            Anonym: max. {formatBytes(APP_LIMITS.anonymous.maxFileSizeBytes)} pro Datei, {APP_LIMITS.anonymous.uploadsPerHour} Uploads pro Stunde. Registriert: {formatBytes(APP_LIMITS.registered.dailyQuotaBytes)} pro Kalendertag.
          </p>
        </div>

        {batchError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="font-medium">Upload konnte nicht gestartet werden</div>
            <div className="mt-1">{batchError}</div>
          </div>
        ) : null}

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-muted-foreground">
              Noch keine Dateien ausgewaehlt.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.clientId} className="rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors hover:bg-black/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.file.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatBytes(item.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {item.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
                    {item.status === "failed" ? <XCircle className="h-4 w-4 text-rose-400" /> : null}
                    {item.status === "uploading" || item.status === "processing" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                    ) : null}
                    <span className="capitalize text-muted-foreground">{item.status}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={item.progress} />
                </div>
                {item.error ? <p className="mt-2 text-sm text-rose-200">{formatUploadErrorMessage(item.error)}</p> : null}
              </div>
            ))
          )}
        </div>

        {shareLinks.length > 0 ? (
          <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="mb-4 flex items-center gap-2 text-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-medium">Share-Links</h3>
            </div>
            <div className="space-y-3">
              {shareLinks.map((link) => (
                <div key={link.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{link.fileName}</p>
                    <p className="truncate text-sm text-emerald-100/80">{link.sharePath}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}${link.sharePath}`)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Link kopieren
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}