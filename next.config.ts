import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/report',       destination: '/file', permanent: false },
      { source: '/report/email', destination: '/file', permanent: false },
    ];
  },
};

export default nextConfig;
