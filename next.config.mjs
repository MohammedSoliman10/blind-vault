/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-only dependencies are not bundled client-side
  serverExternalPackages: ["@coral-xyz/anchor", "litesvm"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
