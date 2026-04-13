import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LatestPublicImage,
  RegisteredUsageSummary,
  UploadRecord,
  UserUploadListItem,
  UserUploadsResult,
} from "@/lib/types/app";
import { createServerClient } from "@/lib/supabase/server";

export const getLatestPublicImages = cache(async (): Promise<LatestPublicImage[]> => {
  const supabase = await createServerClient();
  const admin = createAdminClient();
  const { data } = await supabase
    .from("uploads")
    .select("public_id, original_name, title, alt_text, size_bytes, created_at, bucket_id, storage_path")
    .eq("kind", "image")
    .eq("status", "active")
    .eq("is_public", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(12);

  const images = (data ?? []) as Array<
    Pick<
      UploadRecord,
      "public_id" | "original_name" | "title" | "alt_text" | "size_bytes" | "created_at" | "bucket_id" | "storage_path"
    >
  >;

  return Promise.all(
    images.map(async (image) => ({
      ...image,
      preview_url:
        (await getSignedObjectUrl({
          admin,
          bucket: image.bucket_id,
          path: image.storage_path,
          expiresIn: 60 * 60,
        })) ?? "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80",
    })),
  );
});

export async function getCurrentUserUploads({ limit = 12 }: { limit?: number } = {}): Promise<UserUploadsResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      uploads: [],
      hasMore: false,
      nextLimit: null,
    };
  }

  const { data } = await supabase
    .from("uploads")
    .select("id, public_id, kind, status, original_name, title, size_bytes, created_at, expires_at")
    .eq("owner_user_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  const uploads = (data ?? []) as UserUploadListItem[];
  const sliced = uploads.slice(0, limit);
  const hasMore = uploads.length > limit;

  return {
    uploads: sliced,
    hasMore,
    nextLimit: hasMore ? limit + 12 : null,
  };
}

export async function getUploadByPublicId(publicId: string, kind: UploadRecord["kind"]): Promise<UploadRecord | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("uploads")
    .select("*")
    .eq("public_id", publicId)
    .eq("kind", kind)
    .eq("status", "active")
    .single();

  return data;
}

export async function getUploadByPublicIdAny(publicId: string, kind: UploadRecord["kind"]): Promise<UploadRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("uploads")
    .select("*")
    .eq("public_id", publicId)
    .eq("kind", kind)
    .maybeSingle();

  return data;
}

export async function getSignedObjectUrl({
  admin = createAdminClient(),
  bucket,
  path,
  expiresIn = 60 * 15,
  download,
}: {
  admin?: ReturnType<typeof createAdminClient>;
  bucket: string;
  path: string;
  expiresIn?: number;
  download?: string | boolean;
}) {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn, {
    download,
  });

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}

export async function getRegisteredUsageSummary(): Promise<RegisteredUsageSummary | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  type UsageWindowRow = Pick<
    UploadRecord,
    never
  > & {
    bytes_uploaded: number;
    upload_count: number;
    window_start: string;
  };

  const { data, error } = await supabase
    .from("upload_usage_windows")
    .select("bytes_uploaded, upload_count, window_start")
    .eq("subject_type", "user")
    .eq("subject_key", user.id)
    .eq("window_type", "day")
    .eq("window_start", todayStart.toISOString())
    .maybeSingle();

  const usage = data as UsageWindowRow | null;

  if (error) {
    return null;
  }

  return {
    bytes_used: usage?.bytes_uploaded ?? 0,
    bytes_limit: 2 * 1024 * 1024 * 1024,
    uploads_used: usage?.upload_count ?? 0,
    window_started_at: usage?.window_start ?? todayStart.toISOString(),
  };
}