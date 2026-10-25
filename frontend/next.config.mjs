/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend URL without the NEXT_PUBLIC_ prefix: set API_URL on Vercel and it is
  // baked into the browser bundle at build time.
  env: {
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8095",
  },
};

export default nextConfig;
