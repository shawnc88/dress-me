/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.mux.com' },
      { protocol: 'https', hostname: 'stream.mux.com' },
      { protocol: 'https', hostname: '*.mux.com' },
      { protocol: 'https', hostname: 'bewithmeapp.me' },
      { protocol: 'https', hostname: 'www.bewithmeapp.me' },
    ],
  },
  async rewrites() {
    // Only proxy in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
