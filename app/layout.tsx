import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { APP_COPY, APP_LINKS, APP_VERSION } from "@/lib/constants";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? APP_LINKS.siteUrl),
  title: {
    default: APP_COPY.name,
    template: `%s | ${APP_COPY.name}`,
  },
  description: "Kostenlose All-in-One Plattform fuer temporaere Datei- und Bild-Uploads mit automatischer Loeschung nach sieben Tagen.",
  applicationName: APP_COPY.name,
  keywords: ["Datei-Upload", "Bild-Upload", "Supabase", "Next.js", "temporare Dateien"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: APP_COPY.name,
    description: "Temporare Datei- und Bild-Uploads ohne Werbung, mit automatischer Loeschung nach sieben Tagen.",
    type: "website",
    siteName: APP_COPY.name,
    url: process.env.NEXT_PUBLIC_APP_URL ?? APP_LINKS.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_COPY.name,
    description: "Temporare Datei- und Bild-Uploads ohne Werbung, mit automatischer Loeschung nach sieben Tagen.",
  },
  authors: [{ name: APP_COPY.name, url: APP_LINKS.siteUrl }],
  creator: APP_COPY.name,
  publisher: APP_COPY.name,
  category: "technology",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <body className={spaceGrotesk.variable}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="absolute inset-0 -z-10 bg-grid-glow bg-grid-glow opacity-40" />
            <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(33,211,185,0.18),transparent_56%)]" />
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
            <span className="pointer-events-none fixed bottom-3 left-3 z-50 select-none text-[10px] tracking-wide text-white/35">
              v{APP_VERSION}
            </span>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}