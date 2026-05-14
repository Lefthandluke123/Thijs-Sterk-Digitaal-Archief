import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gofile.me',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.direct.quickconnect.to',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.quickconnect.to',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.*.*',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '192.168.*.*',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
