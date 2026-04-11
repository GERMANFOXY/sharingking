import type { Metadata } from "next";

import { GalleryGrid } from "@/components/home/gallery-grid";
import { HeroUploadShell } from "@/components/home/hero-upload-shell";
import { APP_COPY, APP_LINKS } from "@/lib/constants";
import { getLatestPublicImages } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Kostenlose Datei- und Bild-Uploads",
  description: "SHARINGKING ist eine kostenlose Upload-Plattform fuer Bilder und Dateien mit Galerie, Share-Links und automatischer Loeschung nach sieben Tagen.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${APP_COPY.name} - ${APP_COPY.slogan}`,
    description: "Kostenlose Upload-Plattform fuer Bilder und Dateien mit automatischer Loeschung nach sieben Tagen.",
    url: APP_LINKS.siteUrl,
    siteName: APP_COPY.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_COPY.name} - ${APP_COPY.slogan}`,
    description: "Kostenlose Upload-Plattform fuer Bilder und Dateien mit automatischer Loeschung nach sieben Tagen.",
  },
};

export default async function HomePage() {
  const images = await getLatestPublicImages();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-14 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
      <section className="flex flex-col gap-3 pt-2">
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-semibold">{APP_COPY.shortName}</span>
          <span>{APP_COPY.name}</span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{APP_COPY.slogan}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            Uploads fuer Bilder und Dateien, automatisch nach sieben Tagen geloescht, ohne Werbung und ohne unnötigen Overhead.
          </p>
        </div>
      </section>
      <HeroUploadShell />
      <GalleryGrid images={images} />
      <section className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 text-sm text-muted-foreground shadow-ambient backdrop-blur-xl">
        <p className="text-center leading-7 text-white/85">
          Alle Dateien werden nach 7 Tagen automatisch geloescht • Kostenlos & werbefrei
        </p>
      </section>
    </div>
  );
}