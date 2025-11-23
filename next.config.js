/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  eslint: {
    // Only fail build on ESLint errors, not warnings
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Only fail build on TypeScript errors, not warnings
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['@prisma/client'],
}

module.exports = nextConfig