import { getPins, getStoreFact } from "@/lib/data";
import { citeStoreFact } from "@/lib/citation";
import { jsonResponse, notFoundResponse } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const hit = getStoreFact(decodeURIComponent(key));
  if (!hit) return notFoundResponse("store fact");
  return jsonResponse({
    packageId: hit.packageId,
    citation: citeStoreFact(hit.fact, hit.packageId, getPins()),
    fact: hit.fact,
  });
}
