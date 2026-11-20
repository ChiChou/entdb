import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: isDev ? undefined : "export",
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async rewrites() {
    return [
      {
        source: "/data/:path*",
        // Point at a local build with ENTDB_DATA_ORIGIN, e.g. entdb-data's
        // `python scripts/serve.py build-output` on http://localhost:8787.
        destination: `${process.env.ENTDB_DATA_ORIGIN ?? "https://codecolor.ist/entdb-data"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
