"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Pencil, Trash2, X } from "lucide-react";

import { deleteUploadAction, renameUploadAction, type DashboardActionState } from "@/app/actions/dashboard-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: DashboardActionState = {};

type UploadRowActionsProps = {
  uploadId: string;
  sharePath: string;
  currentName: string;
};

export function UploadRowActions({ uploadId, sharePath, currentName }: UploadRowActionsProps) {
  const router = useRouter();
  const [deleteState, deleteFormAction] = useActionState(deleteUploadAction, initialState);
  const [renameState, renameFormAction] = useActionState(renameUploadAction, initialState);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deleteState.success) return;
    router.refresh();
  }, [router, deleteState.success]);

  useEffect(() => {
    if (!renameState.success) return;
    setRenaming(false);
    router.refresh();
  }, [router, renameState.success]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (renaming) {
      setNameValue(currentName);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [renaming, currentName]);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {renaming ? (
        <form action={renameFormAction} className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
          <input type="hidden" name="uploadId" value={uploadId} />
          <div className="flex gap-2">
            <input
              ref={inputRef}
              name="newName"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              maxLength={255}
              className="h-8 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none sm:w-56"
              placeholder="Neuer Dateiname"
            />
            <SubmitButton size="sm" pendingText="...">
              <Check className="h-4 w-4" />
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {renameState.error ? <p className="text-xs text-rose-200">{renameState.error}</p> : null}
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
              setCopied(true);
            }}
          >
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Kopiert" : "Link kopieren"}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={sharePath}>
              <Link2 className="mr-2 h-4 w-4" />
              Oeffnen
            </a>
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Umbenennen
          </Button>
        </div>
      )}
      <form action={deleteFormAction}>
        <input type="hidden" name="uploadId" value={uploadId} />
        <SubmitButton variant="outline" size="sm" pendingText="Loeschen...">
          <Trash2 className="mr-2 h-4 w-4" />
          Manuell loeschen
        </SubmitButton>
      </form>
      {deleteState.error ? <p className="text-xs text-rose-200">{deleteState.error}</p> : null}
      {deleteState.success ? <p className="text-xs text-emerald-200">{deleteState.success} Die Liste wird aktualisiert.</p> : null}
    </div>
  );
}
