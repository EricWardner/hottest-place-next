/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
    // output: 'export',
   
    source: "/api/hottest-station",
    headers: [
      {
        key: "Cache-Control",
        value: "s-maxage=300, stale-while-revalidate=330",
      },
      {
        key: 'CDN-Cache-Control',
        value: 'max-age=600',
      },
      {
        key: 'Vercel-CDN-Cache-Control',
        value: 'max-age=600',
      },
    ]
  }
   
  module.exports = nextConfig