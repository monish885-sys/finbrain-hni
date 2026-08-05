import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages that Next must transpile for the browser/bundler.
  // @capstone/ca-buddy stays server-only (fs/corpus) — see serverExternalPackages.
  transpilePackages: [
    "@capstone/ui",
    "@capstone/demo-data",
    "@capstone/types",
  ],
  serverExternalPackages: ["@capstone/ca-buddy"],
};

export default nextConfig;
