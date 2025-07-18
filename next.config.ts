/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // During builds, only warn for linting issues instead of failing the build
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.fanart.tv', // Movie assets
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org', // TMDB images
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // GitHub avatars
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // fallback avatar
      },
    ],
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
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
