import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getPins } from "@/lib/data";
import { truncateHash } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  metadataBase: new URL("https://chronicle.institute"),
  title: {
    default: "Chronicle",
    template: "%s — Chronicle",
  },
  description:
    "A public record of what official sources printed, and when. Every fact has a stable, citable address.",
  robots: {
    index: false,
    follow: false,
  },
};

const NAV = [
  { href: "/journal", label: "Journal" },
  { href: "/store", label: "Store" },
  { href: "/revisions", label: "Revisions" },
  { href: "/sources", label: "Sources" },
  { href: "/coverage", label: "Coverage" },
  { href: "/verify", label: "Verify" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pins = getPins();
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Jost:wght@500&family=STIX+Two+Text:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <header className="border-b border-border-soft bg-paper">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="shrink-0 hover:no-underline"
              aria-label="Chronicle home"
            >
              <Wordmark height={20} />
            </Link>
            <nav
              aria-label="Primary"
              className="flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem]"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          {children}
        </main>
        <footer className="mt-16 border-t border-border-soft bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-sm text-text-secondary">
              Unlisted preview. This deployment is not indexed.
            </p>
            <div className="mt-4 font-mono text-xs leading-6 text-text-tertiary">
              <div>
                journal {pins.journal.repo}@{truncateHash(pins.journal.commit, 8)}{" "}
                · state {truncateHash(pins.journal.jsonlSha256, 8)} ·{" "}
                {pins.journal.lineCount} rows
              </div>
              <div>
                store {pins.bundle.repo}@{truncateHash(pins.bundle.commit, 8)} ·{" "}
                {pins.bundle.command} · {pins.bundle.factCount.toLocaleString()}{" "}
                facts
              </div>
              <div>
                acceptance index {pins.availability.repo}@
                {truncateHash(pins.availability.commit, 8)} · snapshot{" "}
                {pins.retrievedAtUtc}
              </div>
            </div>
            <p className="mt-4 text-xs text-text-tertiary">
              <Link href="/about">About Chronicle</Link> ·{" "}
              <Link href="/about#api">Read access</Link> ·{" "}
              <a href="https://thesisinstitute.org">thesisinstitute.org</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
