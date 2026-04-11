import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type ExpiredUpload = {
  id: string;
  bucket_id: string;
  storage_path: string;
  public_id: string;
};

type CleanupSummary = {
  scanned: number;
  deletedRows: number;
  deletedFiles: number;
  storageErrors: Array<{ uploadId: string; message: string }>;
  databaseErrors: Array<{ uploadId: string; message: string }>;
  revalidated: boolean;
};

const corsHeaders = {
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function revalidateFrontend() {
  const revalidateUrl = Deno.env.get("NEXT_REVALIDATE_URL");
  const revalidateSecret = Deno.env.get("NEXT_REVALIDATE_SECRET");

  if (!revalidateUrl || !revalidateSecret) {
    return false;
  }

  try {
    const response = await fetch(revalidateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": revalidateSecret,
      },
      body: JSON.stringify({ paths: ["/", "/dashboard"] }),
    });

    return response.ok;
  } catch (error) {
    console.error("revalidate_failed", error);
    return false;
  }
}

Deno.serve(async (request) => {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = Deno.env.get("CLEANUP_FUNCTION_TOKEN");

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment configuration" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, bucket_id, storage_path, public_id")
    .eq("status", "active")
    .lte("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("expired_upload_query_failed", error);
    return json({ error: error.message }, 500);
  }

  const expiredUploads = (data ?? []) as ExpiredUpload[];
  const summary: CleanupSummary = {
    scanned: expiredUploads.length,
    deletedRows: 0,
    deletedFiles: 0,
    storageErrors: [],
    databaseErrors: [],
    revalidated: false,
  };

  for (const upload of expiredUploads) {
    const { error: storageError } = await supabase.storage.from(upload.bucket_id).remove([upload.storage_path]);

    if (storageError) {
      console.error("storage_delete_failed", { uploadId: upload.id, message: storageError.message });
      summary.storageErrors.push({ uploadId: upload.id, message: storageError.message });
    } else {
      summary.deletedFiles += 1;
    }

    const { error: dbError } = await supabase.from("uploads").delete().eq("id", upload.id);

    if (dbError) {
      console.error("database_delete_failed", { uploadId: upload.id, message: dbError.message });
      summary.databaseErrors.push({ uploadId: upload.id, message: dbError.message });
      continue;
    }

    summary.deletedRows += 1;
  }

  if (summary.deletedRows > 0) {
    summary.revalidated = await revalidateFrontend();
  }

  return json(summary);
});