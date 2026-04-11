export const APP_COPY = {
  name: "Drop7",
  slogan: "7 Tage. Kostenlos. Ohne Bullshit.",
  heroDescription:
    "Kostenlose Upload-Plattform fuer Bilder und Dateien, mit klaren Limits, ohne Werbung und mit automatischer Loeschung nach sieben Tagen.",
} as const;

export const APP_LINKS = {
  siteUrl: "https://drop7.xyz",
  githubUrl: "https://github.com/yourname/drop7",
} as const;

export const APP_LIMITS = {
  anonymous: {
    maxFileSizeBytes: 50 * 1024 * 1024,
    uploadsPerHour: 3,
  },
  registered: {
    dailyQuotaBytes: 2 * 1024 * 1024 * 1024,
  },
} as const;