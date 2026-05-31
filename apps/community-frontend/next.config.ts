import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  basePath: isProd ? "/community" : "",
  assetPrefix: isProd ? "/community" : "",
  images: {
    domains: ["images.unsplash.com"],
  },
};

export default nextConfig;
