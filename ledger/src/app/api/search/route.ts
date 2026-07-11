import { search } from "@/lib/search";
import { jsonResponse } from "@/lib/api";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length > 200) {
    return jsonResponse({ error: "query too long" }, 400);
  }
  return jsonResponse({ query: q, results: search(q) });
}
