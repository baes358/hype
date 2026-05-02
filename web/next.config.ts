import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to /web so Turbopack doesn't pick up the
  // user's home-dir lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
