import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/**/*": ["./music/**/*"],
  },
};

export default nextConfig;
