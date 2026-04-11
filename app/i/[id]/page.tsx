import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { UploadUnavailableState } from "@/components/shared/upload-unavailable-state";
import { getSignedObjectUrl, getUploadByPublicIdAny } from "@/lib/supabase/queries";
import { createServerClient } from "@/lib/supabase/server";
import { getRequestIpHash } from "@/lib/upload";
import { getUploadUnavailableReason, isExpiredDate } from "@/lib/utils";

type ImagePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: ImagePageProps): Promise<Metadata> {
  const { id } = await params;
  const upload = await getUploadByPublicIdAny(id, "image");

  if (!upload) {
    return {
      title: "Bild nicht gefunden",
      description: "Dieses Bild ist nicht mehr verfuegbar.",
      robots: { index: false, follow: false },
    };
  }

  if (!upload.is_public) {
    return {
      title: "Privater Upload",
      description: "Dieses Bild ist privat und nur fuer den Besitzer verfuegbar.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: upload.title ?? upload.original_name,
    description: upload.alt_text ?? `Geteiltes Bild auf SHARINGKING: ${upload.original_name}`,
  };
}

async function canAccessUpload(upload: NonNullable<Awaited<ReturnType<typeof getUploadByPublicIdAny>>>) {
  if (upload.is_public) {
    return true;
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (upload.owner_user_id) {
    return user?.id === upload.owner_user_id;
  }

  if (!upload.owner_ip_hash) {
    return false;
  }

  const requesterIpHash = await getRequestIpHash();
  return requesterIpHash === upload.owner_ip_hash;
}

export default async function ImagePage({ params }: ImagePageProps) {
  const { id } = await params;
  const upload = await getUploadByPublicIdAny(id, "image");

  if (!upload) {
    notFound();
  }

  const unavailableState =
    upload.status === "deleted"
      ? "deleted"
      : isExpiredDate(upload.expires_at)
        ? "expired"
        : null;

  if (unavailableState) {
    const state = getUploadUnavailableReason(unavailableState);
    return <UploadUnavailableState eyebrow={state.eyebrow} title={state.title} description={state.description} />;
  }

  const canAccess = await canAccessUpload(upload);

  if (!canAccess) {
    const state = getUploadUnavailableReason("private");
    return <UploadUnavailableState eyebrow={state.eyebrow} title={state.title} description={state.description} />;
  }

  const imageUrl = await getSignedObjectUrl({
    bucket: upload.bucket_id,
    path: upload.storage_path,
    expiresIn: 60 * 60,
  });

  if (!imageUrl) {
    const state = getUploadUnavailableReason(isExpiredDate(upload.expires_at) ? "expired" : "not-found");
    return <UploadUnavailableState eyebrow={state.eyebrow} title={state.title} description={state.description} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Bild-Link</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{upload.title ?? upload.original_name}</h1>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="relative aspect-[16/10] w-full bg-black/20">
          <Image
            src={imageUrl}
            alt={upload.alt_text ?? upload.original_name}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1200px"
          />
        </div>
      </div>
    </div>
  );
}