import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sharingking/_next/static|sharingking/_next/image|sharingking/favicon.ico|sharingking/.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};