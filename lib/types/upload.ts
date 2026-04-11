import type { UploadRecord } from "@/lib/types/app";

export type UploadMode = "anonymous" | "registered";

export type UploadDraft = {
  clientId: string;
  name: string;
  size: number;
  type: string;
  isPublic: boolean;
};

export type PreparedUpload = {
  clientId: string;
  name: string;
  size: number;
  mimeType: string;
  extension: string | null;
  kind: UploadRecord["kind"];
  bucketId: UploadRecord["bucket_id"];
  storagePath: UploadRecord["storage_path"];
  signedUrl: string;
  token: string;
  isPublic: boolean;
};

export type UploadQuotaSummary = {
  mode: UploadMode;
  uploadsUsed?: number;
  uploadsLimit?: number;
  bytesUsed?: number;
  bytesLimit?: number;
};

export type PrepareUploadsResult =
  | {
      ok: true;
      mode: UploadMode;
      quota: UploadQuotaSummary;
      uploads: PreparedUpload[];
    }
  | {
      ok: false;
      message: string;
    };

export type CompletedUploadLink = {
  id: string;
  clientId: string;
  publicId: string;
  fileName: string;
  kind: UploadRecord["kind"];
  sharePath: string;
};

export type CompleteUploadsResult =
  | {
      ok: true;
      links: CompletedUploadLink[];
    }
  | {
      ok: false;
      message: string;
    };