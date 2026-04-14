import type { NextConfig } from "next";

function getBasePath() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return undefined;
  }

  try {
    const pathname = new URL(appUrl).pathname.replace(/\/$/, "");
    return pathname && pathname !== "/" ? pathname : undefined;
  } catch {
    return undefined;
  }
}

const basePath = getBasePath();

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;