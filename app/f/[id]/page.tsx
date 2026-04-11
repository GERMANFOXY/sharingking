import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { UploadUnavailableState } from "@/components/shared/upload-unavailable-state";
import { getSignedObjectUrl, getUploadByPublicId, getUploadByPublicIdAny } from "@/lib/supabase/queries";
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

  return {
    title: upload.title ?? upload.original_name,
    description: `Geteilte Datei auf SHARINGKING: ${upload.original_name}`,
  };
}

export default async function FilePage({ params }: FilePageProps) {
  const { id } = await params;
  const upload = await getUploadByPublicId(id, "file");

  if (!upload) {
    const existingUpload = await getUploadByPublicIdAny(id, "file");

    if (!existingUpload) {
      notFound();
    }

    const state = getUploadUnavailableReason(
      existingUpload.status === "deleted" ? "deleted" : isExpiredDate(existingUpload.expires_at) ? "expired" : "not-found",
    );

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
        <h1 className="mt-3 text-2xl font-semibold text-white">{upload.original_name}</h1>
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