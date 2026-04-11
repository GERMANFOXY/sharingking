"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Trash2 } from "lucide-react";

import { deleteUploadAction, type DashboardActionState } from "@/app/actions/dashboard-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: DashboardActionState = {};

type UploadRowActionsProps = {
  uploadId: string;
  sharePath: string;
};

export function UploadRowActions({ uploadId, sharePath }: UploadRowActionsProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(deleteUploadAction, initialState);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
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
      </div>
      <form action={formAction}>
        <input type="hidden" name="uploadId" value={uploadId} />
        <SubmitButton variant="outline" size="sm" pendingText="Loeschen...">
          <Trash2 className="mr-2 h-4 w-4" />
          Manuell loeschen
        </SubmitButton>
      </form>
      {state.error ? <p className="text-xs text-rose-200">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-emerald-200">{state.success} Die Liste wird aktualisiert.</p> : null}
    </div>
  );
}