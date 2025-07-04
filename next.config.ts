/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // ...add other config here if needed
};

module.exports = nextConfig;
