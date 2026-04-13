"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export type DashboardActionState = {
  error?: string;
  success?: string;
};

export async function deleteUploadAction(_: DashboardActionState, formData: FormData): Promise<DashboardActionState> {
  const uploadId = String(formData.get("uploadId") ?? "").trim();

  if (!uploadId) {
    return { error: "Upload-ID fehlt." };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bitte zuerst anmelden." };
  }

  const admin = createAdminClient();
  const { data: upload, error: uploadError } = await admin
    .from("uploads")
    .select("id, bucket_id, storage_path, is_public")
    .eq("id", uploadId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (uploadError || !upload) {
    return { error: uploadError?.message ?? "Upload nicht gefunden." };
  }

  const { error: storageError } = await admin.storage.from(upload.bucket_id).remove([upload.storage_path]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: updateError } = await admin
    .from("uploads")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("owner_user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { success: "Upload wurde geloescht." };
}

export async function renameUploadAction(_: DashboardActionState, formData: FormData): Promise<DashboardActionState> {
  const uploadId = String(formData.get("uploadId") ?? "").trim();
  const newName = String(formData.get("newName") ?? "").trim();

  if (!uploadId) {
    return { error: "Upload-ID fehlt." };
  }

  if (!newName) {
    return { error: "Name darf nicht leer sein." };
  }

  if (newName.length > 255) {
    return { error: "Name darf maximal 255 Zeichen lang sein." };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bitte zuerst anmelden." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("uploads")
    .update({ title: newName })
    .eq("id", uploadId)
    .eq("owner_user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { success: "Datei wurde umbenannt." };
}