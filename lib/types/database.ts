export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type EmptyRelationships = [];

export type Database = {
  public: {
    Tables: {
      uploads: {
        Row: {
          id: string;
          public_id: string;
          kind: "image" | "file";
          status: "active" | "deleted" | "expired";
          owner_user_id: string | null;
          owner_ip_hash: string | null;
          bucket_id: string;
          storage_path: string;
          original_name: string;
          mime_type: string | null;
          extension: string | null;
          size_bytes: number;
          is_public: boolean;
          title: string | null;
          alt_text: string | null;
          download_count: number;
          last_accessed_at: string | null;
          metadata: Json;
          created_at: string;
          expires_at: string;
          deleted_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          public_id?: string;
          kind: "image" | "file";
          status?: "active" | "deleted" | "expired";
          owner_user_id?: string | null;
          owner_ip_hash?: string | null;
          bucket_id: string;
          storage_path: string;
          original_name: string;
          mime_type?: string | null;
          extension?: string | null;
          size_bytes: number;
          is_public?: boolean;
          title?: string | null;
          alt_text?: string | null;
          download_count?: number;
          last_accessed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          expires_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          public_id?: string;
          kind?: "image" | "file";
          status?: "active" | "deleted" | "expired";
          owner_user_id?: string | null;
          owner_ip_hash?: string | null;
          bucket_id?: string;
          storage_path?: string;
          original_name?: string;
          mime_type?: string | null;
          extension?: string | null;
          size_bytes?: number;
          is_public?: boolean;
          title?: string | null;
          alt_text?: string | null;
          download_count?: number;
          last_accessed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          expires_at?: string;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          plan_key: string;
          uploads_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          plan_key?: string;
          uploads_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          plan_key?: string;
          uploads_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      upload_limits: {
        Row: {
          key: string;
          label: string;
          max_file_size_bytes: number | null;
          daily_quota_bytes: number | null;
          hourly_upload_limit: number | null;
          allows_dashboard: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          label: string;
          max_file_size_bytes?: number | null;
          daily_quota_bytes?: number | null;
          hourly_upload_limit?: number | null;
          allows_dashboard?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          label?: string;
          max_file_size_bytes?: number | null;
          daily_quota_bytes?: number | null;
          hourly_upload_limit?: number | null;
          allows_dashboard?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      upload_usage_windows: {
        Row: {
          id: number;
          subject_type: "user" | "ip";
          subject_key: string;
          window_type: "hour" | "day";
          window_start: string;
          upload_count: number;
          bytes_uploaded: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          subject_type: "user" | "ip";
          subject_key: string;
          window_type: "hour" | "day";
          window_start: string;
          upload_count?: number;
          bytes_uploaded?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          subject_type?: "user" | "ip";
          subject_key?: string;
          window_type?: "hour" | "day";
          window_start?: string;
          upload_count?: number;
          bytes_uploaded?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
    };
    Views: {
      latest_public_images: {
        Row: {
          public_id: string;
          original_name: string;
          title: string | null;
          alt_text: string | null;
          mime_type: string | null;
          size_bytes: number;
          created_at: string;
        };
        Relationships: EmptyRelationships;
      };
    };
    Functions: {
      get_registered_upload_status: {
        Args: {
          p_owner_user_id: string;
        };
        Returns: {
          bytes_used: number;
          bytes_limit: number;
          uploads_used: number;
          window_started_at: string;
        }[];
      };
      record_upload_usage: {
        Args: {
          p_owner_user_id?: string | null;
          p_owner_ip_hash?: string | null;
          p_size_bytes: number;
          p_created_at?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      upload_kind: "image" | "file";
      upload_status: "active" | "deleted" | "expired";
      usage_subject_type: "user" | "ip";
      usage_window_type: "hour" | "day";
    };
    CompositeTypes: Record<string, never>;
  };
};