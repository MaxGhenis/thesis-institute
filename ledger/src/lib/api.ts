// Shared response helpers for the read API. Data is immutable per deploy, so
// responses are CDN-cached hard and revalidate only on redeploy.

export const CACHE_HEADER = "public, max-age=0, s-maxage=31536000";

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 1), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_HEADER,
    },
  });
}

export function notFoundResponse(what: string): Response {
  return jsonResponse({ error: `${what} not found` }, 404);
}

export function bytesResponse(bytes: Buffer, contentType: string): Response {
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": CACHE_HEADER,
    },
  });
}
