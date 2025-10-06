/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: "standalone",
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Aggressive performance optimizations
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "chart.js",
      "react-chartjs-2",
      "recharts",
      "three"
    ],
    webpackBuildWorker: true,
    // Enable dynamic imports for better code splitting
    esmExternals: true,
  },
  // Enhanced image optimization
  images: {
    unoptimized: true,
    domains: ["localhost"],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable compression
  compress: true,
  // Aggressive webpack optimizations for code splitting
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Enhanced code splitting strategy
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor libraries - split large packages
          vendor_react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
            name: 'vendor-react',
            chunks: 'all',
            priority: 50,
            enforce: true,
          },
          vendor_radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'vendor-radix',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // UI libraries
          vendor_ui: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui\/react-icons|tailwindcss)[\\/]/,
            name: 'vendor-ui',
            chunks: 'all',
            priority: 30,
          },
          // Chart libraries (heavy, load on demand)
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts)[\\/]/,
            name: 'charts',
            chunks: 'async', // Load asynchronously when needed
            priority: 25,
            enforce: true,
          },
          // MQTT and networking libraries
          vendor_networking: {
            test: /[\\/]node_modules[\\/](mqtt|paho-mqtt|axios|websocket)[\\/]/,
            name: 'vendor-networking',
            chunks: 'async',
            priority: 20,
          },
          // Three.js for 3D visualizations (load on demand)
          threejs: {
            test: /[\\/]node_modules[\\/](three|@types\/three)[\\/]/,
            name: 'threejs',
            chunks: 'async',
            priority: 15,
          },
          // Utility libraries
          vendor_utils: {
            test: /[\\/]node_modules[\\/](date-fns|zod|uuid|clsx|class-variance-authority)[\\/]/,
            name: 'vendor-utils',
            chunks: 'all',
            priority: 10,
          },
          // Remaining vendor code
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor-remaining',
            chunks: 'all',
            priority: 5,
            enforce: true,
          },
          // Custom components and business logic
          components: {
            test: /[\\/](components|hooks|contexts|services)[\\/]/,
            name: 'app-components',
            chunks: 'all',
            priority: 3,
          },
          // Heavy components (lazy loaded)
          heavy_components: {
            test: /[\\/]components[\\/](charts|sensor-data-charts|cctv-widget-modern|rack-visualization-dialog)[\\/]/,
            name: 'heavy-components',
            chunks: 'async',
            priority: 2,
          },
          // Core framework and runtime
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](next|@next|@swc|@babel)[\\/]/,
            priority: 40,
            enforce: true,
          },
        },
      };

      // Enable runtime chunk
      config.optimization.runtimeChunk = 'single';

      // Reduce bundle size in production
      if (!dev) {
        // Enable tree shaking
        config.optimization.usedExports = true;

        // Minimize bundle size
        config.optimization.minimizer = config.optimization.minimizer || [];
        // TerserPlugin is already included by Next.js, but we can enhance it

        // Add performance hints
        config.performance = {
          hints: 'warning',
          maxAssetSize: 512000, // 512kb
          maxEntrypointSize: 512000, // 512kb
        };
      }
    }



    return config;
  },
};

export default nextConfig;
