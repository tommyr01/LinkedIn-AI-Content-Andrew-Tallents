/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@linkedin-automation/ui', '@linkedin-automation/ai', '@linkedin-automation/airtable', '@linkedin-automation/lindy'],
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
}

module.exports = nextConfig