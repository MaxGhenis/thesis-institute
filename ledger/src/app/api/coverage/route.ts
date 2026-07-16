import { getCoverage } from "@/lib/data";
import { jsonResponse } from "@/lib/api";

export function GET() {
  return jsonResponse(getCoverage());
}
