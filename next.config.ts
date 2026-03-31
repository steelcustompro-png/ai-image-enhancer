import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  experimental: {
    turbopack: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
