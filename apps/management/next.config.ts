import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/management",
  devIndicators: {
    position: "bottom-left",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/company",
        permanent: false,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
