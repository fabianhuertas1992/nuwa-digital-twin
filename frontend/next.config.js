/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gateway.pinata.cloud', 'earthengine.googleapis.com'],
  },
}

module.exports = nextConfig
