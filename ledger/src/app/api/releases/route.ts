import { getReleases } from "@/lib/data";
import { jsonResponse } from "@/lib/api";

export function GET() {
  const releases = getReleases();
  return jsonResponse({
    stems: releases.map((r) => r.stem),
    manifests: releases.map((r) => r.manifest),
  });
}
