/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-only dependencies are not bundled client-side
  serverExternalPackages: ["@coral-xyz/anchor", "litesvm"],
};

export default nextConfig;
