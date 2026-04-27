import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Keep the dev tools badge away from bottom-right where sticky notes sit */
  devIndicators: {
    position: "bottom-left",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
