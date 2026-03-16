import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for minimal Docker images
};

export default nextConfig;
