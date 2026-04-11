"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getRequestIpHash } from "@/lib/upload";
import { isExpiredDate } from "@/lib/utils";
import type { UploadRecord } from "@/lib/types/app";

export type SelfHelpIntent =
  | "diagnose"
  | "repair"
  | "deep_repair"
  | "privacy_lock"
  | "refresh_access"
  | "purge_expired_owned";

export type SelfHelpPriority = "quick" | "thorough" | "forensic";

type ReportEntry = {
  publicId: string;
  kind: "image" | "file";
  status: "ok" | "error";
  findings: string[];
  fixesApplied: string[];
  hints: string[];
  error?: string;
};

const INTENT_MIN_LATENCY_MS: Record<SelfHelpIntent, number> = {
  diagnose: 1200,
  repair: 1800,
  deep_repair: 2600,
  privacy_lock: 1600,
  refresh_access: 1400,
  purge_expired_owned: 2200,
};

const PRIORITY_MULTIPLIER: Record<SelfHelpPriority, number> = {
  quick: 1,
  thorough: 1.35,
  forensic: 1.8,
};

export type SelfHelpActionState = {
  error?: string;
  success?: string;
  report?: {
    operation: SelfHelpIntent;
    priority: SelfHelpPriority;
    requestedIds: string[];
    processedCount: number;
    successCount: number;
    errorCount: number;
    findings: string[];
    fixesApplied: string[];
    hints: string[];
    entries: ReportEntry[];
    checkedAt: string;
  };
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUploadIds(rawPrimary: string, rawBatch: string) {
  const candidates = [rawPrimary, rawBatch]
    .join("\n")
    .split(/[\n,;\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(candidates)).slice(0, 50);
}

function parsePriority(raw: string): SelfHelpPriority {
  if (raw === "thorough" || raw === "forensic") {
    return raw;
  }
  return "quick";
}

async function getRequesterContext() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ipHash = await getRequestIpHash();

  return { user, ipHash };
}

async function loadOwnedUpload({ publicId, kind }: { publicId: string; kind: "image" | "file" }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("uploads")
    .select("*")
    .eq("public_id", publicId)
    .eq("kind", kind)
    .maybeSingle();

  if (error) {
    return { admin, error: error.message } as const;
  }

  if (!data) {
    return { admin, error: "Upload wurde nicht gefunden." } as const;
  }

  const upload = data as UploadRecord;
  const { user, ipHash } = await getRequesterContext();

  if (upload.owner_user_id) {
    if (user?.id !== upload.owner_user_id) {
      return { admin, error: "Du bist nicht berechtigt, diese Selbsthilfe-Aktion auszufuehren." } as const;
    }
  } else if (upload.owner_ip_hash) {
    if (ipHash !== upload.owner_ip_hash) {
      return { admin, error: "Diese Aktion ist nur fuer den urspruenglichen Uploader moeglich." } as const;
    }
  } else {
    return { admin, error: "Owner-Informationen fehlen. Bitte Upload erneut durchfuehren." } as const;
  }

  return { admin, upload } as const;
}

async function checkStorageObjectExists(admin: ReturnType<typeof createAdminClient>, upload: UploadRecord) {
  const { data, error } = await admin.storage.from(upload.bucket_id).createSignedUrl(upload.storage_path, 30);
  return Boolean(data?.signedUrl) && !error;
}

async function ensureMinLatency(intent: SelfHelpIntent, priority: SelfHelpPriority, startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const minimum = Math.round(INTENT_MIN_LATENCY_MS[intent] * PRIORITY_MULTIPLIER[priority]);

  if (elapsed < minimum) {
    await wait(minimum - elapsed);
  }
}

async function analyzeUpload(
  admin: ReturnType<typeof createAdminClient>,
  upload: UploadRecord,
  priority: SelfHelpPriority,
) {
  const findings: string[] = [];
  const hints: string[] = [];
  const isExpired = isExpiredDate(upload.expires_at);
  const objectExists = await checkStorageObjectExists(admin, upload);
  const isAnonymousUpload = upload.owner_user_id === null && upload.owner_ip_hash !== null;

  findings.push(upload.status === "active" ? "Upload-Status ist aktiv." : `Upload-Status ist ${upload.status}.`);
  findings.push(isExpired ? "Upload ist abgelaufen (7-Tage-Fenster vorbei)." : "Upload liegt noch innerhalb der Laufzeit.");
  findings.push(objectExists ? "Dateiobjekt im Storage wurde gefunden." : "Dateiobjekt im Storage fehlt.");

  if (isAnonymousUpload && upload.is_public) {
    findings.push("Anonymer Upload ist faelschlich als oeffentlich markiert.");
    hints.push("Nutze 'Privatsphaere erzwingen', um die Sichtbarkeit sicher auf privat zu setzen.");
  }

  if (upload.status === "deleted" && objectExists && !isExpired) {
    findings.push("Upload ist geloescht markiert, Objekt existiert aber noch.");
    hints.push("'Deep Repair' kann den Status wieder konsistent herstellen.");
  }

  if (priority !== "quick") {
    const expectedPrefix = upload.owner_user_id ? `user/${upload.owner_user_id}/` : "anon/";
    if (!upload.storage_path.startsWith(expectedPrefix)) {
      findings.push(`Storage-Pfad weicht vom erwarteten Scope ab (${expectedPrefix}).`);
      hints.push("Pruefe den Upload erneut und verifiziere die Zugriffskontexte.");
    }
  }

  if (priority === "forensic") {
    const createdAt = new Date(upload.created_at).getTime();
    const expiresAt = new Date(upload.expires_at).getTime();
    const lifetimeMs = expiresAt - createdAt;
    const expectedMin = 6.5 * 24 * 60 * 60 * 1000;
    const expectedMax = 8 * 24 * 60 * 60 * 1000;

    if (lifetimeMs < expectedMin || lifetimeMs > expectedMax) {
      findings.push("Ablaufzeit-Fenster liegt ausserhalb des erwarteten 7-Tage-Korridors.");
      hints.push("Pruefe Zeitkonfiguration und Upload-Erstellung fuer diesen Eintrag.");
    }
  }

  if (upload.status === "active" && !objectExists) {
    hints.push("'Reparatur' markiert fehlende Objekte automatisch als geloescht.");
  }

  return {
    findings,
    hints,
    isExpired,
    objectExists,
    isAnonymousUpload,
  };
}

export async function selfHelpAssistantAction(
  _: SelfHelpActionState,
  formData: FormData,
): Promise<SelfHelpActionState> {
  const startedAt = Date.now();
  const rawPublicId = String(formData.get("publicId") ?? "").trim();
  const rawPublicIds = String(formData.get("publicIds") ?? "").trim();
  const rawKind = String(formData.get("kind") ?? "file").trim();
  const rawIntent = String(formData.get("intent") ?? "diagnose").trim();
  const rawPriority = String(formData.get("priority") ?? "quick").trim();
  const teamId = String(formData.get("teamId") ?? "").trim() || undefined;

  const intent = rawIntent as SelfHelpIntent;
  const priority = parsePriority(rawPriority);

  if (!(rawIntent in INTENT_MIN_LATENCY_MS)) {
    return { error: "Unbekannte Selbsthilfe-Aktion." };
  }

  if (rawKind !== "image" && rawKind !== "file") {
    return { error: "Unbekannter Upload-Typ." };
  }

  const kind = rawKind as "image" | "file";

  if (intent === "purge_expired_owned") {
    const { user, ipHash } = await getRequesterContext();
    const admin = createAdminClient();
    let query = admin
      .from("uploads")
      .select("id, bucket_id, storage_path")
      .eq("status", "active")
      .lte("expires_at", new Date().toISOString());

    if (user) {
      query = query.eq("owner_user_id", user.id);
    } else {
      query = query.is("owner_user_id", null).eq("owner_ip_hash", ipHash);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    const expiredOwned = (data ?? []) as Array<Pick<UploadRecord, "id" | "bucket_id" | "storage_path">>;

    if (expiredOwned.length === 0) {
      await ensureMinLatency(intent, priority, startedAt);
      
      const report = {
        operation: intent,
        priority,
        requestedIds: [],
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        findings: ["Keine abgelaufenen eigenen Uploads gefunden."],
        fixesApplied: ["Keine Aktion erforderlich."],
        hints: ["System ist bereits bereinigt."],
        entries: [],
        checkedAt: new Date().toISOString(),
      };

      // Log to team if provided
      if (teamId) {
        try {
          const { logOperation } = await import("./team-actions");
          await logOperation(
            teamId,
            intent,
            [],
            priority,
            "success",
            report,
            Date.now() - startedAt,
          );
        } catch (error) {
          console.error("Failed to log operation to team:", error);
        }
      }

      return {
        success: "Bulk-Selbsthilfe abgeschlossen.",
        report,
      };
    }

    const byBucket = expiredOwned.reduce<Record<string, string[]>>((acc, row) => {
      acc[row.bucket_id] ??= [];
      acc[row.bucket_id].push(row.storage_path);
      return acc;
    }, {});

    await Promise.all(
      Object.entries(byBucket).map(([bucketId, paths]) => admin.storage.from(bucketId).remove(paths)),
    );

    const ids = expiredOwned.map((row) => row.id);
    const { error: updateError } = await admin
      .from("uploads")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .in("id", ids);

    if (updateError) {
      return { error: `Bulk-Reparatur fehlgeschlagen: ${updateError.message}` };
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/hilfe-support");

    await ensureMinLatency(intent, priority, startedAt);

    const finalReport = {
      success: "Bulk-Selbsthilfe abgeschlossen.",
      report: {
        operation: intent,
        priority,
        requestedIds: [],
        processedCount: expiredOwned.length,
        successCount: expiredOwned.length,
        errorCount: 0,
        findings: [`${expiredOwned.length} abgelaufene Uploads erkannt.`],
        fixesApplied: ["Abgelaufene Uploads im Storage entfernt und konsistent auf geloescht gesetzt."],
        hints: ["Die Bereinigung kann jederzeit erneut ausgefuehrt werden."],
        entries: [],
        checkedAt: new Date().toISOString(),
      },
    };

    // Log to team if provided
    if (teamId) {
      try {
        const { logOperation } = await import("./team-actions");
        await logOperation(
          teamId,
          intent,
          [],
          priority,
          "success",
          finalReport.report,
          Date.now() - startedAt,
        );
      } catch (error) {
        console.error("Failed to log operation to team:", error);
      }
    }

    return finalReport;
  }

  const requestedIds = parseUploadIds(rawPublicId, rawPublicIds);

  if (requestedIds.length === 0) {
    return { error: "Bitte gib mindestens eine Upload-ID ein." };
  }

  const entries: ReportEntry[] = [];
  const findings: string[] = [];
  const fixesApplied: string[] = [];
  const hints: string[] = [];

  for (const publicId of requestedIds) {
    const ownedUpload = await loadOwnedUpload({ publicId, kind });

    if ("error" in ownedUpload) {
      entries.push({
        publicId,
        kind,
        status: "error",
        findings: [],
        fixesApplied: [],
        hints: [],
        error: ownedUpload.error,
      });
      continue;
    }

    const { admin, upload } = ownedUpload;
    const analysis = await analyzeUpload(admin, upload, priority);
    const entryFixes: string[] = [];

    if (intent === "privacy_lock" || intent === "repair" || intent === "deep_repair") {
      if (analysis.isAnonymousUpload && upload.is_public) {
        const { error } = await admin.from("uploads").update({ is_public: false }).eq("id", upload.id);
        if (error) {
          entries.push({
            publicId,
            kind,
            status: "error",
            findings: analysis.findings,
            fixesApplied: [],
            hints: analysis.hints,
            error: `Privatsphaere-Reparatur fehlgeschlagen: ${error.message}`,
          });
          continue;
        }

        entryFixes.push("Sichtbarkeit auf privat korrigiert.");
        upload.is_public = false;
      }
    }

    if (intent === "refresh_access") {
      if (upload.status !== "active") {
        entries.push({
          publicId,
          kind,
          status: "error",
          findings: analysis.findings,
          fixesApplied: entryFixes,
          hints: analysis.hints,
          error: "Zugriffstest nur fuer aktive Uploads moeglich.",
        });
        continue;
      }

      if (analysis.isExpired || !analysis.objectExists) {
        entries.push({
          publicId,
          kind,
          status: "error",
          findings: analysis.findings,
          fixesApplied: entryFixes,
          hints: analysis.hints,
          error: "Zugriffstest nicht moeglich (abgelaufen oder Objekt fehlt).",
        });
        continue;
      }

      const { data, error } = await admin.storage.from(upload.bucket_id).createSignedUrl(upload.storage_path, 300);
      if (error || !data?.signedUrl) {
        entries.push({
          publicId,
          kind,
          status: "error",
          findings: analysis.findings,
          fixesApplied: entryFixes,
          hints: analysis.hints,
          error: error?.message ?? "Signed URL konnte nicht erneuert werden.",
        });
        continue;
      }

      entryFixes.push("Frische Zugriffssignatur wurde erzeugt und getestet.");
      analysis.findings.push("Zugriffssignatur ist funktionsfaehig.");
    }

    if (intent === "repair" || intent === "deep_repair") {
      if (upload.status === "active" && analysis.isExpired) {
        if (analysis.objectExists) {
          const { error: storageError } = await admin.storage.from(upload.bucket_id).remove([upload.storage_path]);
          if (storageError) {
            entries.push({
              publicId,
              kind,
              status: "error",
              findings: analysis.findings,
              fixesApplied: entryFixes,
              hints: analysis.hints,
              error: `Dateibereinigung fehlgeschlagen: ${storageError.message}`,
            });
            continue;
          }
        }

        const { error: updateError } = await admin
          .from("uploads")
          .update({ status: "deleted", deleted_at: new Date().toISOString() })
          .eq("id", upload.id);

        if (updateError) {
          entries.push({
            publicId,
            kind,
            status: "error",
            findings: analysis.findings,
            fixesApplied: entryFixes,
            hints: analysis.hints,
            error: `Status-Reparatur fehlgeschlagen: ${updateError.message}`,
          });
          continue;
        }

        entryFixes.push("Abgelaufenen Upload entfernt und als geloescht markiert.");
        upload.status = "deleted";
      }

      if (upload.status === "active" && !analysis.objectExists) {
        const { error: updateError } = await admin
          .from("uploads")
          .update({ status: "deleted", deleted_at: new Date().toISOString() })
          .eq("id", upload.id);

        if (updateError) {
          entries.push({
            publicId,
            kind,
            status: "error",
            findings: analysis.findings,
            fixesApplied: entryFixes,
            hints: analysis.hints,
            error: `Metadaten-Reparatur fehlgeschlagen: ${updateError.message}`,
          });
          continue;
        }

        entryFixes.push("Fehlendes Storage-Objekt erkannt und Eintrag als geloescht gesetzt.");
        upload.status = "deleted";
      }
    }

    if (intent === "deep_repair") {
      if (upload.status === "deleted" && !analysis.isExpired && analysis.objectExists) {
        const { error } = await admin.from("uploads").update({ status: "active", deleted_at: null }).eq("id", upload.id);
        if (!error) {
          entryFixes.push("Loeschmarkierung aufgehoben, da Objekt vorhanden und gueltig.");
        }
      }
    }

    if (entryFixes.length === 0 && intent !== "diagnose") {
      entryFixes.push("Keine Reparatur noetig. Zustand ist konsistent.");
    }

    entries.push({
      publicId,
      kind,
      status: "ok",
      findings: analysis.findings,
      fixesApplied: entryFixes,
      hints: analysis.hints,
    });
  }

  const okEntries = entries.filter((entry) => entry.status === "ok");
  const errorEntries = entries.filter((entry) => entry.status === "error");

  okEntries.forEach((entry) => {
    findings.push(...entry.findings.map((item) => `[${entry.publicId}] ${item}`));
    fixesApplied.push(...entry.fixesApplied.map((item) => `[${entry.publicId}] ${item}`));
    hints.push(...entry.hints.map((item) => `[${entry.publicId}] ${item}`));
  });

  errorEntries.forEach((entry) => {
    if (entry.error) {
      findings.push(`[${entry.publicId}] Fehler: ${entry.error}`);
    }
  });

  if (intent !== "diagnose") {
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/hilfe-support");
  }

  await ensureMinLatency(intent, priority, startedAt);

  const finalResult = {
    success:
      intent === "diagnose"
        ? "Selbsthilfe-Diagnose abgeschlossen."
        : `Selbsthilfe-Operation abgeschlossen (${okEntries.length}/${entries.length} erfolgreich).`,
    report: {
      operation: intent,
      priority,
      requestedIds,
      processedCount: entries.length,
      successCount: okEntries.length,
      errorCount: errorEntries.length,
      findings,
      fixesApplied,
      hints,
      entries,
      checkedAt: new Date().toISOString(),
    },
  };

  // Log to team if provided
  if (teamId) {
    try {
      const { logOperation } = await import("./team-actions");
      await logOperation(
        teamId,
        intent,
        requestedIds,
        priority,
        errorEntries.length === 0 ? "success" : errorEntries.length < entries.length ? "partial" : "failed",
        finalResult.report,
        Date.now() - startedAt,
      );
    } catch (error) {
      console.error("Failed to log operation to team:", error);
    }
  }

  return finalResult;
}
