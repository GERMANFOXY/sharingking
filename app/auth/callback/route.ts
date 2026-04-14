import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  const basePath = url.pathname.endsWith("/auth/callback")
    ? url.pathname.slice(0, -"/auth/callback".length)
    : "";
  const redirectPath = safeNext === "/" ? basePath || "/" : `${basePath}${safeNext}`;

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(redirectPath, url.origin));
}