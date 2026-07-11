import type { MetadataRoute } from "next";

// Unlisted deployment: disallow all crawling until the public launch
// decision. Remove together with the X-Robots-Tag header and metadata.robots.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
