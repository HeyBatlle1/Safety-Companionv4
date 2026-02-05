import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Using default output mode */
  experimental: {
    // @ts-ignore
    turbopack: {
      root: '.',
    },
  },
};

export default nextConfig;
