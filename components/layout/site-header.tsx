import Link from "next/link";
import Image from "next/image";

import { signOutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { APP_COPY } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canSeeTeamButton = false;
  if (user) {
    const [{ data: memberRow }, { data: ownerRow }] = await Promise.all([
      supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("teams")
        .select("id")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    canSeeTeamButton = Boolean(memberRow || ownerRow);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-20 w-32 items-center justify-center overflow-hidden">
            <Image
              src="/branding/logo.png"
              alt="SHARINGKING Logo"
              width={1408}
              height={768}
              className="h-20 w-auto object-contain"
              priority
            />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-white">{APP_COPY.name}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{APP_COPY.slogan}</p>
          </div>
        </Link>
        <nav className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/hilfe-support">Hilfe &amp; Selbsthilfe</Link>
          </Button>
          {user ? (
            <>
              {canSeeTeamButton ? (
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/team">👥 Team</Link>
                </Button>
              ) : null}
              <form action={signOutAction}>
                <Button type="submit" variant="ghost">Logout</Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Registrieren</Link>
              </Button>
            </>
          )}
          <Button asChild>
            <Link href="/dashboard">Meine Uploads</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}