import {
  getAnchorBytes,
  getImmutablePrefixRawBytes,
  getJournalRawBytes,
  getReleaseFileBytes,
} from "@/lib/data";
import { bytesResponse, notFoundResponse } from "@/lib/api";

// Exact committed bytes for independent verification. Whitelisted paths
// only; every response is byte-identical to the vendored file.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const path = parts.join("/");

  if (path === "journal.jsonl") {
    return bytesResponse(getJournalRawBytes(), "application/x-ndjson; charset=utf-8");
  }
  if (path === "immutable_prefix.json") {
    return bytesResponse(
      getImmutablePrefixRawBytes(),
      "application/json; charset=utf-8",
    );
  }
  if (parts.length === 2 && parts[0] === "releases") {
    const bytes = getReleaseFileBytes(parts[1]);
    if (!bytes) return notFoundResponse("release file");
    const contentType = parts[1].endsWith(".json")
      ? "application/json; charset=utf-8"
      : "application/octet-stream";
    return bytesResponse(bytes, contentType);
  }
  if (parts.length === 2 && parts[0] === "anchors") {
    const bytes = getAnchorBytes(parts[1]);
    if (!bytes) return notFoundResponse("anchor file");
    return bytesResponse(bytes, "text/plain; charset=utf-8");
  }
  return notFoundResponse("raw file");
}
