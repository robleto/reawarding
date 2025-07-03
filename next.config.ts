/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['assets.fanart.tv', 'image.tmdb.org'],
    remotePatterns: [
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
