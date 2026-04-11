import Link from "next/link";

import { APP_LINKS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>Made with ❤️ and Copilot</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/impressum" className="transition-colors hover:text-white">
            Impressum
          </Link>
          <a href={APP_LINKS.githubUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}