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
  // The record moved to chronicle.institute (2026-08-05). The old host
  // forwards every path so existing citations keep resolving. Temporary
  // (307) while Chronicle is a working name; flip to permanent: true after
  // the name clears its gates.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ledger.thesisinstitute.org" }],
        destination: "https://chronicle.institute/:path*",
        permanent: false,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;
