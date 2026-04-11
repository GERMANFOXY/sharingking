import type { Metadata } from "next";

import { GalleryGrid } from "@/components/home/gallery-grid";
import { HeroUploadShell } from "@/components/home/hero-upload-shell";
import { APP_COPY, APP_LINKS } from "@/lib/constants";
import { getLatestPublicImages } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Professionelle Datei- und Bildfreigabe",
  description: "SHARINGKING ist eine professionelle Plattform fuer Datei- und Bildfreigaben mit Galerie, Share-Links und automatischer Loeschung nach sieben Tagen.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${APP_COPY.name} - ${APP_COPY.slogan}`,
    description: "Professionelle Plattform fuer Datei- und Bildfreigaben mit automatischer Loeschung nach sieben Tagen.",
    url: APP_LINKS.siteUrl,
    siteName: APP_COPY.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_COPY.name} - ${APP_COPY.slogan}`,
    description: "Professionelle Plattform fuer Datei- und Bildfreigaben mit automatischer Loeschung nach sieben Tagen.",
  },
};

export default async function HomePage() {
  const images = await getLatestPublicImages();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-14 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
      <section className="flex flex-col gap-3 pt-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{APP_COPY.slogan}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            Professionelle Datei- und Bildfreigabe mit klaren Richtlinien, sicherer Bereitstellung und automatischer Loeschung nach sieben Tagen.
          </p>
        </div>
      </section>
      <HeroUploadShell />
      <GalleryGrid images={images} />
      <section className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 text-sm text-muted-foreground shadow-ambient backdrop-blur-xl">
        <p className="text-center leading-7 text-white/85">
          Transparente Upload-Regeln • Automatische Loeschung nach 7 Tagen • Zuverlaessige Bereitstellung
        </p>
      </section>
    </div>
  );
}