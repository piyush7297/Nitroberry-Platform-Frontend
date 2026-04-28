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
        destination: "/management/company",
        permanent: false,
        basePath: false,
      },
      {
        source: "/management",
        destination: "/management/company",
        permanent: false,
        basePath: false,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
