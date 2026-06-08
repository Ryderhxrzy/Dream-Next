import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for small, low-RAM production images.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
