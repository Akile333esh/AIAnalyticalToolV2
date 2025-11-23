/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        https: false,
        http: false,
        stream: false,
        zlib: false,
        path: false, // Added path
        os: false,   // Added os
      };
    }
    return config;
  },
};

export default nextConfig;