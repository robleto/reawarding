/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // During builds, only warn for linting issues instead of failing the build
    ignoreDuringBuilds: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 750, 828, 1080],
    imageSizes: [160, 210, 320],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.fanart.tv', // Movie assets
      },
      {
        protocol: 'https',
        hostname: 'images.fanart.tv', // Fanart CDN alternate
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org', // TMDB images
      },
      {
        protocol: 'https',
        hostname: 'media.themoviedb.org', // Alternate TMDB media host
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com', // YouTube thumbnails
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // GitHub avatars
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // fallback avatar
      },
      {
        protocol: 'https',
        hostname: 'cjrpnzwrldlxajkvznca.supabase.co', // Supabase Storage
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev', // Cloudflare R2 public bucket domains
      },
      {
        protocol: 'https',
        hostname: 'pub-6b3a2dfce3484ea291e496348a19d788.r2.dev', // Current media cache domain
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle Node.js modules that shouldn't be bundled for the browser
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
  // ...add other config here if needed
};

module.exports = nextConfig;
