import type { Database } from "@/lib/types/database";

export type UploadRecord = Database["public"]["Tables"]["uploads"]["Row"];

export type LatestPublicImage = Pick<
  UploadRecord,
  "public_id" | "original_name" | "title" | "alt_text" | "size_bytes" | "created_at" | "bucket_id" | "storage_path"
> & {
  preview_url: string;
};

export type UserUploadListItem = Pick<
  UploadRecord,
  "id" | "public_id" | "kind" | "status" | "original_name" | "size_bytes" | "created_at" | "expires_at"
>;

export type UserUploadsResult = {
  uploads: UserUploadListItem[];
  hasMore: boolean;
  nextLimit: number | null;
};

export type RegisteredUsageSummary = {
  bytes_used: number;
  bytes_limit: number;
  uploads_used: number;
  window_started_at: string;
};