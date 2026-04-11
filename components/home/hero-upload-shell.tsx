import { Clock3, FileUp, ShieldCheck } from "lucide-react";

import { APP_COPY } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { HeroUploadClient } from "@/components/home/hero-upload-client";

const featureItems = [
  {
    icon: FileUp,
    title: "Dateien und Bilder",
    description: "Ein Bereich fuer schnelle Uploads, egal ob PNG, ZIP oder PDF.",
  },
  {
    icon: Clock3,
    title: "Automatischer Ablauf",
    description: "Alles wird exakt nach sieben Tagen entfernt.",
  },
  {
    icon: ShieldCheck,
    title: "Datenschutz & Limits",
    description: "Anonyme Uploads sind privat, registrierte Konten nutzen bis zu 2 GB pro Kalendertag.",
  },
];

export async function HeroUploadShell() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="grid gap-8 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
      <div className="space-y-6 animate-floatIn">
        <Badge className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">Kostenlos. Ohne Werbung.</Badge>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
            Ein klarer Upload-Hub fuer Bilder und Dateien.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {APP_COPY.heroDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Anonym: privat, max. 50 MB</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">3 Uploads pro Stunde pro IP</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Registriert: 2 GB pro Tag</span>
        </div>
      </div>

      <div className="space-y-4">
        <HeroUploadClient isAuthenticated={Boolean(user)} />
        <div className="grid gap-3 sm:grid-cols-3">
          {featureItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <item.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}