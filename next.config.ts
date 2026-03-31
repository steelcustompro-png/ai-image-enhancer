import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
