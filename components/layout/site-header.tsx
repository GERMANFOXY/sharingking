import Link from "next/link";

import { signOutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { APP_COPY } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-sm font-semibold text-primary shadow-ambient">
            D7
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-white">{APP_COPY.name}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{APP_COPY.slogan}</p>
          </div>
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <form action={signOutAction}>
              <Button type="submit" variant="ghost">Logout</Button>
            </form>
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