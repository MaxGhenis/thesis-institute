import { getRegistry } from "@/lib/data";
import { jsonResponse } from "@/lib/api";

export function GET() {
  return jsonResponse(getRegistry());
}
