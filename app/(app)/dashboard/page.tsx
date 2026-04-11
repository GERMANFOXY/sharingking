import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UsageSummaryCard } from "@/components/dashboard/usage-summary-card";
import { UploadsTableShell } from "@/components/dashboard/uploads-table-shell";
import { getCurrentUserUploads, getRegisteredUsageSummary } from "@/lib/supabase/queries";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Meine Uploads",
  description: "Dashboard fuer registrierte SHARINGKING-Nutzer mit Upload-Verwaltung, Share-Links und Tagesverbrauch.",
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardPageProps = {
  searchParams: Promise<{
    limit?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { limit } = await searchParams;
  const parsedLimit = Number(limit ?? "12");
  const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 12), 72) : 12;
  const [uploadsResult, usageSummary] = await Promise.all([
    getCurrentUserUploads({ limit: safeLimit }),
    getRegisteredUsageSummary(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Meine Uploads</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Alle eigenen Uploads mit Share-Link, Restlaufzeit und manueller Loeschung. Bei vielen Eintraegen kannst du die Liste schrittweise erweitern.
        </p>
      </div>
      {usageSummary ? <UsageSummaryCard usage={usageSummary} /> : null}
      <UploadsTableShell uploads={uploadsResult.uploads} nextLimit={uploadsResult.nextLimit} />
    </div>
  );
}