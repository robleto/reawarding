const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      {
        source: '/films/:slug-:id',
        destination: '/films/:slug/:id',
        permanent: true,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 750, 828, 1080],
    imageSizes: [160, 210, 320],
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.fanart.tv' },
      { protocol: 'https', hostname: 'images.fanart.tv' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'media.themoviedb.org' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'cjrpnzwrldlxajkvznca.supabase.co' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'pub-6b3a2dfce3484ea291e496348a19d788.r2.dev' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: "creative-madness",
  project: "reawarding",

  // Auth token for source map uploads — set SENTRY_AUTH_TOKEN in Netlify env vars.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Hide source maps from the client bundle
  hideSourceMaps: true,

  // Tree-shake Sentry debug code in production
  disableLogger: true,
});
