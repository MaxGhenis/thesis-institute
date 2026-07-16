import { CopyButton } from "./CopyButton";
import { CITATION_FORMAT_VERSION } from "@/lib/citation";

/**
 * The record slip: the citable line for a fact, rendered as the artifact it
 * is. The text passed here is exactly what the copy button copies.
 */
export function CitationSlip({ citation }: { citation: string }) {
  return (
    <figure className="my-6">
      <div className="slip" data-citation-format={CITATION_FORMAT_VERSION}>
        {citation}
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-text-tertiary">
          Citation format {CITATION_FORMAT_VERSION} — not yet frozen; the
          format is versioned and changes will be breaking.
        </span>
        <CopyButton text={citation} />
      </figcaption>
    </figure>
  );
}
