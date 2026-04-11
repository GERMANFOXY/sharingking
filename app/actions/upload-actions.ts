"use server";

import { revalidatePath } from "next/cache";

import { APP_LIMITS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type {
  CompleteUploadsResult,
  PrepareUploadsResult,
  PreparedUpload,
  UploadDraft,
  UploadMode,
} from "@/lib/types/upload";
import {
  buildStoragePath,
  formatLimitError,
  getBucketForKind,
  getFileExtension,
  getRequestIpHash,
  getUploadKind,
  getUtcDayWindowStart,
  getUtcHourWindowStart,
  normalizeMimeType,
} from "@/lib/upload";

type UploadUsageWindow = Database["public"]["Tables"]["upload_usage_windows"]["Row"];

type CompleteUploadInput = Pick<
  PreparedUpload,
  "clientId" | "name" | "size" | "mimeType" | "extension" | "kind" | "bucketId" | "storagePath" | "isPublic"
>;

function ensureDrafts(files: UploadDraft[]) {
  if (files.length === 0) {
    throw new Error("Bitte waehle mindestens eine Datei aus.");
  }

  files.forEach((file) => {
    if (!file.name || file.size <= 0) {
      throw new Error("Mindestens eine Datei ist ungueltig.");
    }
  });
}

async function getCurrentMode() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    user,
    mode: (user ? "registered" : "anonymous") as UploadMode,
  };
}

async function getUsageWindow(admin: ReturnType<typeof createAdminClient>, {
  subjectType,
  subjectKey,
  windowType,
  windowStart,
}: {
  subjectType: UploadUsageWindow["subject_type"];
  subjectKey: string;
  windowType: UploadUsageWindow["window_type"];
  windowStart: string;
}) {
  const { data, error } = await admin
    .from("upload_usage_windows")
    .select("upload_count, bytes_uploaded")
    .eq("subject_type", subjectType)
    .eq("subject_key", subjectKey)
    .eq("window_type", windowType)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    uploadCount: data?.upload_count ?? 0,
    bytesUploaded: data?.bytes_uploaded ?? 0,
  };
}

export async function prepareUploadsAction(files: UploadDraft[]): Promise<PrepareUploadsResult> {
  try {
    ensureDrafts(files);

    const admin = createAdminClient();
    const { user, mode } = await getCurrentMode();
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (mode === "anonymous") {
      const tooLarge = files.find((file) => file.size > APP_LIMITS.anonymous.maxFileSizeBytes);

      if (tooLarge) {
        return {
          ok: false,
          message: `Anonyme Uploads sind auf 50 MB pro Datei begrenzt. Betroffen: ${tooLarge.name}.`,
        };
      }

      const ipHash = await getRequestIpHash();
      const currentUsage = await getUsageWindow(admin, {
        subjectType: "ip",
        subjectKey: ipHash,
        windowType: "hour",
        windowStart: getUtcHourWindowStart(),
      });

      if (currentUsage.uploadCount + files.length > APP_LIMITS.anonymous.uploadsPerHour) {
        return {
          ok: false,
          message: formatLimitError({
            mode,
            currentCount: currentUsage.uploadCount,
            incomingCount: files.length,
          }),
        };
      }
    }

    if (mode === "registered") {
      const currentUsage = await getUsageWindow(admin, {
        subjectType: "user",
        subjectKey: user!.id,
        windowType: "day",
        windowStart: getUtcDayWindowStart(),
      });

      if (currentUsage.bytesUploaded + totalBytes > APP_LIMITS.registered.dailyQuotaBytes) {
        return {
          ok: false,
          message: formatLimitError({
            mode,
            currentBytes: currentUsage.bytesUploaded,
            incomingBytes: totalBytes,
          }),
        };
      }
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const kind = getUploadKind(file);
        const bucketId = getBucketForKind(kind);
        const storagePath = buildStoragePath({
          fileName: file.name,
          mode,
          userId: user?.id,
        });
        const { data, error } = await admin.storage.from(bucketId).createSignedUploadUrl(storagePath);

        if (error || !data) {
          throw new Error(error?.message ?? `Signed Upload URL fuer ${file.name} konnte nicht erstellt werden.`);
        }

        return {
          clientId: file.clientId,
          name: file.name,
          size: file.size,
          mimeType: normalizeMimeType(file),
          extension: getFileExtension(file.name),
          kind,
          bucketId,
          storagePath,
          signedUrl: data.signedUrl,
          token: data.token,
          isPublic: mode === "registered" ? file.isPublic : true,
        } satisfies PreparedUpload;
      }),
    );

    if (mode === "anonymous") {
      const ipHash = await getRequestIpHash();
      const currentUsage = await getUsageWindow(admin, {
        subjectType: "ip",
        subjectKey: ipHash,
        windowType: "hour",
        windowStart: getUtcHourWindowStart(),
      });

      return {
        ok: true,
        mode,
        quota: {
          mode,
          uploadsUsed: currentUsage.uploadCount,
          uploadsLimit: APP_LIMITS.anonymous.uploadsPerHour,
        },
        uploads,
      };
    }

    const currentUsage = await getUsageWindow(admin, {
      subjectType: "user",
      subjectKey: user!.id,
      windowType: "day",
      windowStart: getUtcDayWindowStart(),
    });

    return {
      ok: true,
      mode,
      quota: {
        mode,
        bytesUsed: currentUsage.bytesUploaded,
        bytesLimit: APP_LIMITS.registered.dailyQuotaBytes,
      },
      uploads,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upload konnte nicht vorbereitet werden.",
    };
  }
}

export async function completeUploadsAction(uploads: CompleteUploadInput[]): Promise<CompleteUploadsResult> {
  const admin = createAdminClient();

  try {
    if (uploads.length === 0) {
      return {
        ok: false,
        message: "Keine erfolgreichen Uploads zum Abschliessen vorhanden.",
      };
    }

    const { user, mode } = await getCurrentMode();
    const ownerIpHash = mode === "anonymous" ? await getRequestIpHash() : null;

    const rows = uploads.map((upload) => ({
      kind: upload.kind,
      owner_user_id: user?.id ?? null,
      owner_ip_hash: ownerIpHash,
      bucket_id: upload.bucketId,
      storage_path: upload.storagePath,
      original_name: upload.name,
      mime_type: upload.mimeType,
      extension: upload.extension,
      size_bytes: upload.size,
      is_public: mode === "registered" ? upload.isPublic : true,
    }));

    const { data, error } = await admin
      .from("uploads")
      .insert(rows)
      .select("id, public_id, kind, original_name");

    if (error || !data) {
      const byBucket = uploads.reduce<Record<string, string[]>>((acc, upload) => {
        acc[upload.bucketId] ??= [];
        acc[upload.bucketId].push(upload.storagePath);
        return acc;
      }, {});

      await Promise.all(
        Object.entries(byBucket).map(([bucketId, paths]) => admin.storage.from(bucketId).remove(paths)),
      );

      return {
        ok: false,
        message: error?.message ?? "Upload-Eintraege konnten nicht gespeichert werden.",
      };
    }

    await Promise.all(
      uploads.map((upload) =>
        admin.rpc("record_upload_usage", {
          p_owner_user_id: user?.id ?? null,
          p_owner_ip_hash: ownerIpHash,
          p_size_bytes: upload.size,
        }),
      ),
    );

    revalidatePath("/");
    revalidatePath("/dashboard");

    return {
      ok: true,
      links: data.map((row, index) => ({
        id: row.id,
        clientId: uploads[index]!.clientId,
        publicId: row.public_id,
        fileName: row.original_name,
        kind: row.kind,
        sharePath: row.kind === "image" ? `/i/${row.public_id}` : `/f/${row.public_id}`,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upload konnte nicht abgeschlossen werden.",
    };
  }
}