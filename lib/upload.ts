import { createHash, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { APP_LIMITS } from "@/lib/constants";
import type { UploadDraft, UploadMode } from "@/lib/types/upload";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "heic"]);

export function getUploadKind(file: Pick<UploadDraft, "name" | "type">) {
  const extension = getFileExtension(file.name);

  if (file.type.startsWith("image/") || (extension && IMAGE_EXTENSIONS.has(extension))) {
    return "image" as const;
  }

  return "file" as const;
}

export function getBucketForKind(kind: ReturnType<typeof getUploadKind>) {
  return kind === "image" ? "images" : "files";
}

export function getFileExtension(fileName: string) {
  const segments = fileName.split(".");

  if (segments.length < 2) {
    return null;
  }

  return segments.at(-1)?.toLowerCase() ?? null;
}

export function normalizeMimeType(file: Pick<UploadDraft, "type" | "name">) {
  if (file.type) {
    return file.type;
  }

  return getUploadKind(file) === "image" ? "image/*" : "application/octet-stream";
}

export function buildStoragePath({
  fileName,
  mode,
  userId,
}: {
  fileName: string;
  mode: UploadMode;
  userId?: string;
}) {
  const now = new Date();
  const extension = getFileExtension(fileName) ?? "bin";
  const safeBaseName = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "upload";

  const scope = mode === "registered" && userId ? `user/${userId}` : `anon/${now.toISOString().slice(0, 10)}`;

  return `${scope}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}-${safeBaseName}.${extension}`;
}

export async function getRequestIpHash() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const realIp = headerList.get("x-real-ip");
  const rawIp = forwarded?.split(",")[0]?.trim() || realIp || "0.0.0.0";
  const salt = process.env.UPLOAD_IP_HASH_SALT ?? "freehub-local-salt";

  return createHash("sha256").update(`${salt}:${rawIp}`).digest("hex");
}

export function getUtcHourWindowStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), 0, 0, 0)).toISOString();
}

export function getUtcDayWindowStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

export function formatLimitError({ mode, currentCount, incomingCount, currentBytes, incomingBytes }: {
  mode: UploadMode;
  currentCount?: number;
  incomingCount?: number;
  currentBytes?: number;
  incomingBytes?: number;
}) {
  if (mode === "anonymous") {
    const remaining = Math.max(APP_LIMITS.anonymous.uploadsPerHour - (currentCount ?? 0), 0);
    return `Anonym sind maximal ${APP_LIMITS.anonymous.uploadsPerHour} Uploads pro Stunde erlaubt. Noch verfuegbar: ${remaining}. Ausgewaehlt: ${incomingCount ?? 0}.`;
  }

  const remainingBytes = Math.max(APP_LIMITS.registered.dailyQuotaBytes - (currentBytes ?? 0), 0);
  const requestedBytes = incomingBytes ?? 0;
  const remainingGb = (remainingBytes / 1024 / 1024 / 1024).toFixed(2);
  const requestedGb = (requestedBytes / 1024 / 1024 / 1024).toFixed(2);

  return `Dein Tageslimit ist erreicht oder waere ueberschritten. Verfuegbar: ${remainingGb} GB, angefordert: ${requestedGb} GB.`;
}