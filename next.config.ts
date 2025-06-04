import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["0.0.0.0:3003"],
    },
  },
  // Configure the server port
  async headers() {
    return []
  },
};

export default nextConfig;
