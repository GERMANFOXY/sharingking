import Image from "next/image";
import Link from "next/link";

import type { LatestPublicImage } from "@/lib/types/app";
import { formatBytes, formatRelativeUploadAge } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type GalleryGridProps = {
  images: LatestPublicImage[];
};

export function GalleryGrid({ images }: GalleryGridProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Galerie</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Neueste oeffentliche Bilder</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Direkt unter dem Upload-Bereich angeordnet, minimal und fokussiert. Hover-Zustaende sind bereits fuer die
          spaetere Live-Galerie vorbereitet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.length === 0 ? (
          <Card className="col-span-full border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
            Noch keine oeffentlichen Bilder vorhanden. Nach dem ersten Upload erscheinen hier automatisch Previews.
          </Card>
        ) : (
          images.map((image, index) => (
            <Link
              key={image.public_id}
              href={`/i/${image.public_id}`}
              className="group relative block overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-ambient transition-transform duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/20">
                <Image
                  src={image.preview_url}
                  alt={image.alt_text ?? image.title ?? image.original_name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
                  <h3 className="line-clamp-1 text-sm font-medium text-white">{image.title ?? image.original_name}</h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                    <span>{formatBytes(image.size_bytes)}</span>
                    <span>{formatRelativeUploadAge(image.created_at)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}