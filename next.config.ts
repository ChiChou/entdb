import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

if (typeof nextConfig.basePath === "string") {
  process.env.NEXT_PUBLIC_BASE_PATH = nextConfig.basePath;
}

export default nextConfig;
