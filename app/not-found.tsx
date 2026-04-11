import { UploadUnavailableState } from "@/components/shared/upload-unavailable-state";

export default function NotFound() {
  return (
    <UploadUnavailableState
      eyebrow="404"
      title="Upload nicht gefunden"
      description="Die Datei wurde geloescht, ist abgelaufen oder die URL ist ungueltig. Du kannst jederzeit neue Uploads ueber die Startseite anlegen."
    />
  );
}