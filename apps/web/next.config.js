/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@linkedin-automation/ui', '@linkedin-automation/ai', '@linkedin-automation/airtable', '@linkedin-automation/lindy'],
}

module.exports = nextConfig