import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Platzhalter fuer das Impressum von Drop7.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Impressum</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Impressum folgt</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        Diese Seite ist ein Platzhalter fuer die spaetere Impressum-Angabe vor dem produktiven Launch.
      </p>
    </div>
  );
}