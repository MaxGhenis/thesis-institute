import { getJournal, getJournalEntry, getPins, getReleases } from "@/lib/data";
import { citeJournalEntry } from "@/lib/citation";
import { deriveRowStatus } from "@/lib/status";
import { jsonResponse, notFoundResponse } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = getJournalEntry(decodeURIComponent(id));
  if (!entry) return notFoundResponse("journal fact");
  const releases = getReleases().map((r) => r.manifest);
  const pins = getPins();
  return jsonResponse({
    line: entry.line,
    inImmutablePrefix: entry.inImmutablePrefix,
    status: deriveRowStatus(entry, releases),
    availability: entry.availability,
    citation: citeJournalEntry(
      entry,
      pins,
      getJournal().length,
      releases[releases.length - 1].releaseIndex,
    ),
    row: entry.row,
  });
}
