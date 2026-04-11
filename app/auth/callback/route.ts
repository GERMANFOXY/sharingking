import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${await getBaseUrl()}${next}`);
}