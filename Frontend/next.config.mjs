/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    webpackBuildWorker: true,
    // Remove turbo as it might conflict with other optimizations
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    domains: ["localhost"],
    formats: ["image/webp", "image/avif"],
  },
  // Compress responses
  compress: true,
  // Simplified webpack optimizations to avoid CSS conflicts
  webpack: (config, { isServer }) => {
    // Only apply optimizations for client-side builds
    if (!isServer) {
      // Keep default Next.js optimization but add minimal custom chunks
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Only separate large icon libraries to reduce initial bundle
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui)[\\/]/,
            name: "icons",
            chunks: "all",
            priority: 20,
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
