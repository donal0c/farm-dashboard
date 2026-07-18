import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep development-only controls out of accessibility and visual QA.
  devIndicators: false,
};

export default nextConfig;
