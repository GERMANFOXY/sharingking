import type { Metadata } from "next";
import Link from "next/link";

import { SelfHelpConsole } from "@/components/help/self-help-console";

export const metadata: Metadata = {
  title: "Hilfe und Selbsthilfe",
  description: "Selbsthilfe-Bereich von SHARINGKING mit Schnellhilfe, FAQ und klaren Loesungswegen.",
};

const faqItems = [
  {
    question: "Wer kann meine Uploads sehen?",
    answer:
      "Anonyme Uploads sind privat und nur fuer den urspruenglichen Uploader verfuegbar. Registrierte Uploads koennen je nach Freigabe geteilt werden.",
  },
  {
    question: "Wie lange bleiben Dateien gespeichert?",
    answer: "Alle Uploads werden automatisch nach sieben Tagen geloescht.",
  },
  {
    question: "Welche Limits gelten?",
    answer: "Anonym: 50 MB pro Datei und 3 Uploads pro Stunde. Registriert: 2 GB pro Kalendertag.",
  },
] as const;

export default function HelpSupportPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-ambient backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Hilfe & Selbsthilfe</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Schnelle Loesungen ohne Wartezeit</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Dieser Bereich ist auf Selbsthilfe ausgelegt: klare Schritte, haeufige Fragen und direkte Orientierung fuer
          typische Upload-Themen.
        </p>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-lg font-semibold text-white">System-Checks</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Prueft Upload-Status, Ablaufdatum, Sichtbarkeit und Storage-Konsistenz automatisiert.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-lg font-semibold text-white">Auto-Reparatur</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Korrigiert erkannte Inkonsistenzen selbst, z. B. falsche Sichtbarkeit oder veraltete Eintraege.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-lg font-semibold text-white">Nutzerkontrolle</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Aktionen sind auf den eigenen Upload begrenzt. Das System handelt im Hintergrund, ohne manuelle Technikschritte.
          </p>
        </article>
      </section>

      <div className="mt-8">
        <SelfHelpConsole />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-semibold text-white">Schnellstart in 3 Schritten</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            1. Datei neu hochladen und Upload-Fortschritt bis 100% abwarten. 2. Share-Link direkt nach dem Upload
            kopieren. 3. Link in einem privaten Browserfenster testen.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link
              href="/impressum"
              className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-white transition-colors hover:bg-black/30"
            >
              Rechtliche Angaben
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Wenn ein Upload nicht sichtbar ist, pruefe zuerst Ablaufdatum, Dateigroesse und ob du im selben Konto oder
            Netzwerk bist. Anonyme Uploads sind privat und nur fuer den urspruenglichen Uploader abrufbar.
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-4">
        <h2 className="text-xl font-semibold text-white">Haeufige Fragen</h2>
        {faqItems.map((item) => (
          <article key={item.question} className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h3 className="text-lg font-semibold text-white">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
