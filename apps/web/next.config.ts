import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@capstone/ui", "@capstone/demo-data", "@capstone/types"],
};

export default nextConfig;
