"use server";

import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function loginAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort ausfuellen." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function registerAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!email || !password || !confirmPassword) {
    return { error: "Bitte alle Felder ausfuellen." };
  }

  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }

  if (password !== confirmPassword) {
    return { error: "Die Passwoerter stimmen nicht ueberein." };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success: "Konto angelegt. Pruefe deine E-Mail fuer die Bestätigung oder den Magic Link.",
  };
}

export async function sendMagicLinkAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readString(formData, "email").toLowerCase();

  if (!email) {
    return { error: "Bitte eine gueltige E-Mail angeben." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Magic Link wurde versendet. Oeffne den Link in deiner E-Mail, um direkt ins Dashboard zu gelangen.",
  };
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}