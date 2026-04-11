import Link from "next/link";

import { Button } from "@/components/ui/button";

type UploadUnavailableStateProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function UploadUnavailableState({ eyebrow, title, description }: UploadUnavailableStateProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm uppercase tracking-[0.25em] text-primary/80">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Zur Startseite</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Meine Uploads</Link>
        </Button>
      </div>
    </div>
  );
}