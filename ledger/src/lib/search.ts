// Server-side search over the pinned snapshot. The corpus is built once per
// instance and scored per query; only the top matches travel to the client.

import { getJournal, getRegistry, getStoreIndex } from "./data";
import { formatPeriod } from "./format";

export interface SearchDoc {
  kind: "journal" | "store" | "package";
  id: string; // permalink id
  title: string;
  detail: string;
  haystack: string; // lowercased matchable text (not displayed)
}

let corpus: SearchDoc[] | null = null;

export function getSearchCorpus(): SearchDoc[] {
  if (corpus) return corpus;
  const docs: SearchDoc[] = [];

  for (const e of getJournal()) {
    const r = e.row;
    docs.push({
      kind: "journal",
      id: r.source_record_id,
      title: r.source_record_id,
      detail: r.label,
      haystack: [
        r.label,
        r.source.source_name,
        r.geography.name,
        r.measure.concept,
        r.measure.source_concept,
        r.domain,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const p of getRegistry().packages) {
    docs.push({
      kind: "package",
      id: p.package_id,
      title: p.package_id,
      detail: p.label ?? p.source_table ?? "",
      haystack: [p.label, p.source_table, p.authority]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const f of getStoreIndex()) {
    const title = f.label.replace(/\s*\[[^\]]*\]\s*$/, "");
    docs.push({
      kind: "store",
      id: f.k,
      title,
      detail: `${f.pkg} · ${formatPeriod(f.pt, f.pv)}`,
      haystack: [f.k, f.pkg, f.src, f.c, f.gn]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  }

  corpus = docs;
  return corpus;
}

export function scoreDoc(doc: SearchDoc, terms: string[]): number {
  let s = 0;
  const title = doc.title.toLowerCase();
  for (const t of terms) {
    const inTitle = title.includes(t);
    const inHay = doc.haystack.includes(t);
    if (!inTitle && !inHay) return 0; // every term must match somewhere
    s += inTitle ? 3 : 1;
    if (title.startsWith(t)) s += 2;
  }
  return s;
}

export function search(query: string, limit = 50): SearchDoc[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (!terms.length) return [];
  const scored: { d: SearchDoc; s: number }[] = [];
  for (const d of getSearchCorpus()) {
    const s = scoreDoc(d, terms);
    if (s > 0) scored.push({ d, s });
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.d);
}
