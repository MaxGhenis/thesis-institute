import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Unlisted deployment: every response carries noindex until the public
  // launch decision. Remove the header, metadata.robots, and robots.ts
  // together when that decision is made.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;
