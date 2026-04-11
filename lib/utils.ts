import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatRelativeUploadAge(isoDate: string) {
  const formatter = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
  const diff = new Date(isoDate).getTime() - Date.now();
  const minutes = Math.round(diff / (1000 * 60));
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (Math.abs(days) >= 1) {
    return formatter.format(days, "day");
  }

  if (Math.abs(hours) >= 1) {
    return formatter.format(hours, "hour");
  }

  return formatter.format(minutes, "minute");
}

export function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

export function formatRemainingLifetime(isoDate: string) {
  const remainingMs = new Date(isoDate).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Abgelaufen";
  }

  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const remainingDays = Math.floor(remainingHours / 24);

  if (remainingDays >= 1) {
    return `Noch ${remainingDays} Tag${remainingDays === 1 ? "" : "e"} uebrig`;
  }

  return `Noch ${remainingHours} Stunde${remainingHours === 1 ? "" : "n"} uebrig`;
}

export function isExpiredDate(isoDate: string) {
  return new Date(isoDate).getTime() <= Date.now();
}

export function getUploadUnavailableReason(status: "not-found" | "expired" | "deleted") {
  if (status === "expired") {
    return {
      eyebrow: "Abgelaufen",
      title: "Dieser Link ist abgelaufen",
      description: "SHARINGKING entfernt Uploads automatisch nach sieben Tagen. Der Link ist deshalb nicht mehr verfuegbar.",
    };
  }

  if (status === "deleted") {
    return {
      eyebrow: "Nicht mehr verfuegbar",
      title: "Dieser Upload wurde entfernt",
      description: "Die Datei wurde manuell geloescht und ist deshalb nicht mehr abrufbar.",
    };
  }

  return {
    eyebrow: "404",
    title: "Upload nicht gefunden",
    description: "Die URL ist ungueltig oder der Upload existiert nicht mehr.",
  };
}

export function formatUploadErrorMessage(message: string) {
  if (message.includes("50 MB")) {
    return "Die Datei ist fuer den anonymen Modus zu gross. Maximal 50 MB pro Datei sind erlaubt.";
  }

  if (message.includes("3 Uploads pro Stunde") || message.includes("maximal 3 Uploads")) {
    return "Zu viele anonyme Uploads in dieser Stunde. Bitte warte kurz und versuche es spaeter erneut.";
  }

  if (message.includes("Tageslimit") || message.includes("2.00 GB") || message.includes("2 GB")) {
    return "Dein Tageslimit fuer registrierte Uploads ist erreicht. Morgen um Mitternacht UTC wird das Limit zurueckgesetzt.";
  }

  if (message.includes("Upload fehlgeschlagen")) {
    return "Die Datei konnte nicht vollstaendig uebertragen werden. Bitte pruefe deine Verbindung und versuche es erneut.";
  }

  return message;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}