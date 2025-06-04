import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["0.0.0.0:3003"],
    },
  },
  // Configure webpack for proper path resolution in Docker
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Ensure @ alias works in Docker with explicit path resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/app': path.resolve(__dirname, 'app'),
      '@/hooks': path.resolve(__dirname, 'hooks'),
      '@/styles': path.resolve(__dirname, 'styles'),
    };
    
    // Add extensions to ensure files are found
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.jsx', 
      '.js',
      '.json',
      ...config.resolve.extensions,
    ];

    // Ensure case sensitivity is handled properly
    config.resolve.cacheWithContext = false;
    
    return config;
  },
  // Configure the server port
  async headers() {
    return []
  },
};

export default nextConfig;
