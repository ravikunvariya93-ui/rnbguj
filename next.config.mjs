/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    // Tree-shake the giant icon lib per-page instead of bundling it whole.
    optimizePackageImports: ['lucide-react'],
    // Allow client router cache to serve navigations instantly.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
