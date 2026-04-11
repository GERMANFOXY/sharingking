"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { selfHelpAssistantAction, type SelfHelpActionState } from "@/app/actions/self-help-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: SelfHelpActionState = {};

const loadingPhrases = [
  "Analyse laeuft: Upload-Metadaten werden korreliert...",
  "Storage-Integritaet wird geprueft...",
  "Privatsphaere-Regeln werden validiert...",
  "Entscheidungs-Engine priorisiert Selbsthilfe-Massnahmen...",
  "Audit-Zusammenfassung wird erstellt...",
] as const;

export function SelfHelpConsole() {
  const [state, formAction] = useActionState(selfHelpAssistantAction, initialState);
  const [activeIntent, setActiveIntent] = useState<string>("diagnose");
  const [busy, setBusy] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);

  const currentIntentLabel = useMemo(() => {
    if (activeIntent === "diagnose") {
      return "Diagnose";
    }
    if (activeIntent === "repair") {
      return "Standard-Reparatur";
    }
    if (activeIntent === "deep_repair") {
      return "Deep Repair";
    }
    if (activeIntent === "privacy_lock") {
      return "Privatsphaere erzwingen";
    }
    if (activeIntent === "refresh_access") {
      return "Zugriff neu pruefen";
    }
    if (activeIntent === "purge_expired_owned") {
      return "Ablauf-Bereinigung";
    }

    return "Selbsthilfe";
  }, [activeIntent]);

  const auditJson = useMemo(() => {
    if (!state.report) {
      return "";
    }

    return JSON.stringify(state.report, null, 2);
  }, [state.report]);

  useEffect(() => {
    if (!busy) {
      return;
    }

    const interval = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % loadingPhrases.length);
    }, 450);

    return () => window.clearInterval(interval);
  }, [busy]);

  useEffect(() => {
    if (state.error || state.success) {
      setBusy(false);
    }
  }, [state.error, state.success]);

  async function copyAudit() {
    if (!auditJson) {
      return;
    }

    await navigator.clipboard.writeText(auditJson);
  }

  function downloadAudit() {
    if (!auditJson) {
      return;
    }

    const blob = new Blob([auditJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `selfhelp-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-ambient backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Automatischer Selbsthilfe-Assistent</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Enterprise Diagnose und Auto-Reparatur</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        Das System prueft Upload-Zustand, Storage-Konsistenz und Privatsphaeren-Regeln selbst. Mehrere IDs koennen in
        einem Lauf verarbeitet werden, inklusive exportierbarer Audit-Ausgabe.
      </p>

      <form
        action={async (formData) => {
          const nextIntent = String(formData.get("intent") ?? "diagnose");
          setActiveIntent(nextIntent);
          setPhaseIndex(0);
          setBusy(true);
          await formAction(formData);
        }}
        className="mt-6 grid gap-4"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <label htmlFor="publicId" className="mb-2 block text-sm text-white">
              Einzel-ID
            </label>
            <Input id="publicId" name="publicId" placeholder="z. B. j79bX7UVRLdh" />
          </div>
          <div>
            <label htmlFor="publicIds" className="mb-2 block text-sm text-white">
              Mehrfach-IDs (pro Zeile oder per Komma)
            </label>
            <textarea
              id="publicIds"
              name="publicIds"
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary"
              placeholder="abc123\ndef456\nghi789"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[12rem_12rem]">
          <div>
            <label htmlFor="kind" className="mb-2 block text-sm text-white">
              Typ
            </label>
            <select
              id="kind"
              name="kind"
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition-colors focus-visible:border-primary"
              defaultValue="file"
            >
              <option value="file">Datei</option>
              <option value="image">Bild</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="mb-2 block text-sm text-white">
              Prioritaet
            </label>
            <select
              id="priority"
              name="priority"
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition-colors focus-visible:border-primary"
              defaultValue="quick"
            >
              <option value="quick">Quick</option>
              <option value="thorough">Thorough</option>
              <option value="forensic">Forensic</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Bulk-Lauf: Mehrfach-IDs im Feld eintragen. Das System arbeitet alle IDs im gewaehlten Modus automatisch ab.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button type="submit" name="intent" value="diagnose" variant="secondary" disabled={busy}>
            Diagnose starten
          </Button>
          <Button type="submit" name="intent" value="repair" disabled={busy}>
            Standard-Reparatur
          </Button>
          <Button type="submit" name="intent" value="deep_repair" variant="secondary" disabled={busy}>
            Deep Repair
          </Button>
          <Button type="submit" name="intent" value="privacy_lock" variant="secondary" disabled={busy}>
            Privatsphaere erzwingen
          </Button>
          <Button type="submit" name="intent" value="refresh_access" variant="secondary" disabled={busy}>
            Zugriff neu pruefen
          </Button>
          <Button type="submit" name="intent" value="purge_expired_owned" disabled={busy}>
            Ablauf-Bereinigung
          </Button>
        </div>
      </form>

      {busy ? (
        <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          <p className="font-medium">{currentIntentLabel} wird ausgefuehrt...</p>
          <p className="mt-1">{loadingPhrases[phaseIndex]}</p>
        </div>
      ) : null}

      {state.error ? (
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{state.error}</div>
      ) : null}

      {state.success ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {state.success}
        </div>
      ) : null}

      {state.report ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-white">Lauf-Zusammenfassung</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktion: {state.report.operation} • Prioritaet: {state.report.priority} • Verarbeitet: {state.report.processedCount} •
              Erfolg: {state.report.successCount} • Fehler: {state.report.errorCount}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {state.report.findings.slice(0, 10).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-white">Ausgefuehrte Aktionen</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {state.report.fixesApplied.length > 0 ? (
                state.report.fixesApplied.slice(0, 10).map((item) => <li key={item}>• {item}</li>)
              ) : (
                <li>• Keine automatischen Aenderungen in diesem Lauf.</li>
              )}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-semibold text-white">Audit Export</h3>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" onClick={() => void copyAudit()}>
                Audit kopieren
              </Button>
              <Button type="button" onClick={downloadAudit}>
                Audit herunterladen
              </Button>
            </div>
            <label htmlFor="audit-json" className="sr-only">
              Audit JSON Ausgabe
            </label>
            <textarea
              id="audit-json"
              readOnly
              value={auditJson}
              className="mt-3 min-h-44 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground"
            />
          </article>
        </div>
      ) : null}

      {state.report && state.report.entries.length > 0 ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-semibold text-white">Einzel-Reports</h3>
          <div className="mt-4 grid gap-3">
            {state.report.entries.map((entry) => (
              <article key={`${entry.publicId}-${entry.status}`} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                <p className="font-medium text-white">
                  {entry.publicId} • {entry.kind} • {entry.status === "ok" ? "OK" : "Fehler"}
                </p>
                {entry.error ? <p className="mt-2 text-rose-200">{entry.error}</p> : null}
                {entry.fixesApplied.length > 0 ? (
                  <p className="mt-2 text-muted-foreground">Aktionen: {entry.fixesApplied.join(" | ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
