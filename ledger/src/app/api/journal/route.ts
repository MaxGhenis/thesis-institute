import { getJournal, getPins } from "@/lib/data";
import { jsonResponse } from "@/lib/api";

export function GET() {
  const pins = getPins();
  return jsonResponse({
    schemaVersion: "thesis_ledger_app_journal_v1",
    pins: pins.journal,
    rows: getJournal().map((e) => ({
      line: e.line,
      inImmutablePrefix: e.inImmutablePrefix,
      availability: e.availability,
      row: e.row,
    })),
  });
}
