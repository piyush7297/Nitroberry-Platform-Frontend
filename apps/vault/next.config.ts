import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/vault",
  // Redirect bare root (localhost:3001/) → /vault so dev visits land correctly
  async redirects() {
    return [
      {
        source: "/",
        destination: "/vault",
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
