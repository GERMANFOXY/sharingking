import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { UploadUnavailableState } from "@/components/shared/upload-unavailable-state";
import { getSignedObjectUrl, getUploadByPublicIdAny } from "@/lib/supabase/queries";
import { createServerClient } from "@/lib/supabase/server";
import { getRequestIpHash } from "@/lib/upload";
import { getUploadUnavailableReason, isExpiredDate } from "@/lib/utils";

type FilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: FilePageProps): Promise<Metadata> {
  const { id } = await params;
  const upload = await getUploadByPublicIdAny(id, "file");

  if (!upload) {
    return {
      title: "Datei nicht gefunden",
      description: "Diese Datei ist nicht mehr verfuegbar.",
      robots: { index: false, follow: false },
    };
  }

  if (!upload.is_public) {
    return {
      title: "Privater Upload",
      description: "Diese Datei ist privat und nur fuer den Besitzer verfuegbar.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: upload.title ?? upload.original_name,
    description: `Geteilte Datei auf SHARINGKING: ${upload.original_name}`,
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

export default async function FilePage({ params }: FilePageProps) {
  const { id } = await params;
  const upload = await getUploadByPublicIdAny(id, "file");

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

  const downloadUrl = await getSignedObjectUrl({
    bucket: upload.bucket_id,
    path: upload.storage_path,
    expiresIn: 60 * 15,
    download: upload.original_name,
  });

  if (!downloadUrl) {
    const state = getUploadUnavailableReason(isExpiredDate(upload.expires_at) ? "expired" : "not-found");
    return <UploadUnavailableState eyebrow={state.eyebrow} title={state.title} description={state.description} />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.25em] text-primary/80">Datei-Link</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">{upload.title ?? upload.original_name}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Der Link bleibt stabil unter der SHARINGKING-URL, waehrend die Datei intern ueber eine kurzlebige Signed URL aus
          dem privaten Storage ausgeliefert wird.
        </p>
        <Button asChild className="mt-6">
          <Link href={downloadUrl}>Datei herunterladen</Link>
        </Button>
      </div>
    </div>
  );
}