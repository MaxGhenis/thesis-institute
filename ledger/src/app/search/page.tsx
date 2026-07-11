import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { getSearchCorpus } from "@/lib/search";
import { SearchClient } from "./search-client";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  const corpusSize = getSearchCorpus().length;
  return (
    <div>
      <PageHeader
        title="Search"
        lede="Search across journal rows, store facts, and source packages by identifier, label, source, geography, or concept."
      />
      <SearchClient corpusSize={corpusSize} />
    </div>
  );
}
