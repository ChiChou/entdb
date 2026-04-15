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
        destination: "https://codecolor.ist/entdb-data/:path*",
      },
    ];
  },
};

export default nextConfig;
