import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.replicate.delivery" },
    ],
  },
  // The report PDF embeds Noto Sans (read from disk at runtime) so Polish,
  // Romanian and Ukrainian text renders; make sure the files ship with it.
  outputFileTracingIncludes: {
    "/api/report/[id]/pdf": ["./src/lib/pdf/fonts/*.ttf"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
