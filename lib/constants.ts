export const APP_COPY = {
  name: "SHARINGKING",
  shortName: "SK",
  slogan: "Sicher teilen. Klar verwalten.",
  heroDescription:
    "Professionelle Plattform fuer Datei- und Bildfreigaben mit klaren Richtlinien, transparenter Nutzung und automatischer Loeschung nach sieben Tagen.",
} as const;

export const APP_LINKS = {
  siteUrl: "https://foxyverse.de/sharingking",
  githubUrl: "https://github.com/GERMANFOXY/sharingking",
} as const;

export const APP_VERSION = "13.04.26.03.40";

export const APP_LIMITS = {
  anonymous: {
    maxFileSizeBytes: 50 * 1024 * 1024,
    uploadsPerHour: 3,
  },
  registered: {
    dailyQuotaBytes: 2 * 1024 * 1024 * 1024,
  },
} as const;