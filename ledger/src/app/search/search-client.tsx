"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconSearch } from "@tabler/icons-react";

interface SearchDoc {
  kind: "journal" | "store" | "package";
  id: string;
  title: string;
  detail: string;
}

const KIND_LABEL: Record<SearchDoc["kind"], string> = {
  journal: "journal",
  store: "store",
  package: "package",
};

export function SearchClient({ corpusSize }: { corpusSize: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setPending(false);
      return;
    }
    setPending(true);
    const seq = ++requestSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { results: SearchDoc[] };
        if (requestSeq.current === seq) {
          setResults(data.results);
          setError(null);
          setPending(false);
        }
      } catch (e) {
        if (requestSeq.current === seq) {
          setError(String(e));
          setPending(false);
        }
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="max-w-3xl">
      <label className="flex items-center gap-2 border border-border-strong bg-paper px-3 py-2 focus-within:border-horizon-700">
        <IconSearch size={18} className="shrink-0 text-text-tertiary" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${corpusSize.toLocaleString()} records`}
          aria-label="Search the Ledger"
          className="w-full bg-transparent text-base outline-none placeholder:text-text-disabled"
        />
      </label>
      {error ? (
        <p className="mt-4 text-sm text-rose-700" role="alert">
          Search failed: {error}
        </p>
      ) : null}
      {query.trim() && !pending && !error ? (
        <p className="mt-3 text-sm text-text-tertiary" role="status">
          {results.length === 50
            ? "First 50 matches"
            : `${results.length} match${results.length === 1 ? "" : "es"}`}
        </p>
      ) : null}
      <ul className="mt-2 divide-y divide-border-soft">
        {results.map((r) => (
          <li key={`${r.kind}:${r.id}`} className="py-3">
            <div className="flex items-baseline gap-3">
              <span className="stamp stamp-neutral">{KIND_LABEL[r.kind]}</span>
              <Link
                href={
                  r.kind === "journal"
                    ? `/journal/${encodeURIComponent(r.id)}`
                    : r.kind === "store"
                      ? `/store/${r.id}`
                      : `/sources/${encodeURIComponent(r.id)}`
                }
                className="record-id"
              >
                {r.title}
              </Link>
            </div>
            <p className="mt-1 text-sm text-text-tertiary">{r.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
