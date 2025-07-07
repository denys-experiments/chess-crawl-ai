import type {NextConfig} from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true'

const nextConfig: NextConfig = {
  output: 'export', // Needed for static export
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Needed for static export with next/image
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add basePath and assetPrefix for GitHub Pages deployment
  ...(isGithubActions && {
    basePath: '/chess-crawl-ai',
    assetPrefix: '/chess-crawl-ai/',
  }),
};

export default nextConfig;
