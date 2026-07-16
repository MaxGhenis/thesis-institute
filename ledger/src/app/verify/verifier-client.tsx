"use client";

import { useCallback, useState } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleDashed,
  IconPlayerPlay,
} from "@tabler/icons-react";
import type { Check, ChainVerification } from "@/lib/verify/chain";
import { verifyChain } from "@/lib/verify/chain";
import { formatUtc } from "@/lib/format";

async function fetchBytes(path: string): Promise<Uint8Array> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function CheckRow({ check }: { check: Check }) {
  const icon =
    check.status === "pass" ? (
      <IconCircleCheck size={16} className="mt-0.5 shrink-0 text-horizon-700" aria-hidden />
    ) : check.status === "fail" ? (
      <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-700" aria-hidden />
    ) : (
      <IconCircleDashed size={16} className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden />
    );
  const statusText =
    check.status === "pass"
      ? "pass"
      : check.status === "fail"
        ? "FAIL"
        : "not checked in browser";
  return (
    <li className="flex items-start gap-2 py-1.5">
      {icon}
      <div>
        <span className="text-sm">{check.title}</span>{" "}
        <span
          className={
            check.status === "fail"
              ? "font-mono text-xs font-semibold text-rose-700"
              : "font-mono text-xs text-text-tertiary"
          }
        >
          — {statusText}
        </span>
        <div className="font-mono text-xs text-text-tertiary">{check.detail}</div>
      </div>
    </li>
  );
}

export function VerifierClient() {
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "running"; step: string }
    | { phase: "done"; result: ChainVerification }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  const run = useCallback(async () => {
    try {
      setState({ phase: "running", step: "Fetching committed bytes" });
      const releaseList = (await (await fetch("/api/releases")).json()) as {
        stems: string[];
      };
      const journalBytes = await fetchBytes("/api/raw/journal.jsonl");
      const prefixBytes = await fetchBytes("/api/raw/immutable_prefix.json");
      const pubkeyPem = new TextDecoder().decode(
        await fetchBytes("/api/raw/anchors/producer-ed25519.pub"),
      );
      const manifestFiles = await Promise.all(
        releaseList.stems.map(async (stem) => {
          const [json, freetsa, digicert, producerSig] = await Promise.all([
            fetchBytes(`/api/raw/releases/${stem}.json`),
            fetchBytes(`/api/raw/releases/${stem}.freetsa.tsr`).catch(() => null),
            fetchBytes(`/api/raw/releases/${stem}.digicert.tsr`).catch(() => null),
            fetchBytes(`/api/raw/releases/${stem}.producer.sig`).catch(() => null),
          ]);
          return { stem, json, freetsa, digicert, producerSig };
        }),
      );
      setState({ phase: "running", step: "Recomputing hashes and signatures" });
      const ed = await import("@noble/ed25519");
      const result = await verifyChain({
        manifestFiles,
        journalBytes,
        prefixBytes,
        producerPubkeyPem: pubkeyPem,
        verifyEd25519: (sig, msg, pub) => ed.verifyAsync(sig, msg, pub),
      });
      setState({ phase: "done", result });
    } catch (e) {
      setState({ phase: "error", message: String(e) });
    }
  }, []);

  return (
    <div className="mt-3">
      {state.phase === "idle" ? (
        <button
          type="button"
          onClick={run}
          className="inline-flex items-center gap-2 border border-border-strong bg-paper px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
        >
          <IconPlayerPlay size={16} aria-hidden />
          Run the checks in this browser
        </button>
      ) : null}
      {state.phase === "running" ? (
        <p className="text-sm text-text-secondary" role="status">
          {state.step}…
        </p>
      ) : null}
      {state.phase === "error" ? (
        <p className="border border-rose-300 bg-rose-100 p-3 text-sm text-rose-700" role="alert">
          Verification could not run: {state.message}
        </p>
      ) : null}
      {state.phase === "done" ? <Results result={state.result} /> : null}
    </div>
  );
}

function Results({ result }: { result: ChainVerification }) {
  const headline =
    result.failures === 0
      ? `${result.browserChecked} checks passed in this browser; ${result.notCheckedInBrowser} require the offline verifier.`
      : `${result.failures} CHECK${result.failures === 1 ? "" : "S"} FAILED — the committed bytes do not verify.`;
  return (
    <div>
      <p
        className={
          result.failures === 0
            ? "border border-horizon-300 bg-paper p-3 text-sm"
            : "border border-rose-300 bg-rose-100 p-3 text-sm font-medium text-rose-700"
        }
        role="status"
      >
        {headline}
      </p>

      <ul className="mt-4 divide-y divide-border-soft border-y border-border-soft">
        {result.journalChecks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>

      {result.releases.map((release) => (
        <div key={release.stem} className="mt-6">
          <h3 className="font-mono text-sm">
            release {release.manifest.releaseIndex} · {release.stem}
          </h3>
          <p className="mt-1 text-xs text-text-tertiary">
            created {formatUtc(release.manifest.createdAtUtc)} ·{" "}
            {release.manifest.append === null
              ? "genesis (no append block)"
              : `append of ${release.manifest.append.appendedRowCount} rows`}
          </p>
          <ul className="mt-2 divide-y divide-border-soft border-y border-border-soft">
            {release.checks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
          {release.receipts.map((r) => (
            <div key={r.tsa} className="mt-3 pl-4">
              <h4 className="font-mono text-xs uppercase tracking-[0.08em] text-text-secondary">
                {r.tsa} receipt
                {r.genTimeUtc ? ` · genTime ${formatUtc(r.genTimeUtc)}` : ""}
              </h4>
              <ul className="mt-1 divide-y divide-border-soft border-y border-border-soft">
                {r.checks.map((c) => (
                  <CheckRow key={`${r.tsa}-${c.id}`} check={c} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
