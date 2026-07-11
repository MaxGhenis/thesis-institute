// In-browser verification of the witnessed release chain. Runs the checks a
// browser can perform exactly — hash recomputation, canonical-byte equality,
// chain linkage, append reconstruction, Ed25519 producer signature, and
// receipt imprint/genTime extraction — and reports everything it does NOT
// check (RFC 3161 signature chains to the pinned roots) as such, pointing at
// the offline verifier. Check semantics mirror scripts/verify_release_chain.py
// in PolicyEngine/ledger's witnessed-journal branch.

import { canonicalStringify } from "./canonical";
import { OID_SHA256, parseTimestampResponse } from "./der";
import type { ReleaseManifest } from "../types";

export const PRODUCER_SPKI_SHA256 =
  "4a90eff40455ce0d853d4bab1608efbdae1efaf8c06054ead6e396c5b0c4846e";

export const TSA_POLICY_OIDS: Record<string, string> = {
  freetsa: "1.2.3.4.1",
  digicert: "2.16.840.1.114412.7.1",
};

export type CheckStatus = "pass" | "fail" | "not_checked_in_browser";

export interface Check {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
}

export interface ReleaseVerification {
  stem: string;
  manifest: ReleaseManifest;
  checks: Check[];
  receipts: {
    tsa: string;
    genTimeUtc: string | null;
    checks: Check[];
  }[];
}

export interface ChainVerification {
  releases: ReleaseVerification[];
  journalChecks: Check[];
  failures: number;
  browserChecked: number;
  notCheckedInBrowser: number;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function check(id: string, title: string, ok: boolean, detail: string): Check {
  return { id, title, status: ok ? "pass" : "fail", detail };
}

function notChecked(id: string, title: string, detail: string): Check {
  return { id, title, status: "not_checked_in_browser", detail };
}

/** Split journal bytes into per-line byte ranges (each includes its newline). */
function lineOffsets(journal: Uint8Array): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < journal.length; i++) {
    if (journal[i] === 0x0a) offsets.push(i + 1);
  }
  // Trailing offset equals length when the file ends with a newline.
  return offsets;
}

export interface ChainInputs {
  manifestFiles: { stem: string; json: Uint8Array; freetsa: Uint8Array | null; digicert: Uint8Array | null; producerSig: Uint8Array | null }[];
  journalBytes: Uint8Array;
  prefixBytes: Uint8Array;
  producerPubkeyPem: string;
  verifyEd25519: (
    signature: Uint8Array,
    message: Uint8Array,
    publicKeyRaw: Uint8Array,
  ) => Promise<boolean>;
}

export async function verifyChain(inputs: ChainInputs): Promise<ChainVerification> {
  const releases: ReleaseVerification[] = [];
  const journalChecks: Check[] = [];

  const offsets = lineOffsets(inputs.journalBytes);
  const totalLines = offsets.length - 1;
  const journalSha = await sha256Hex(inputs.journalBytes);
  const prefixSha = await sha256Hex(inputs.prefixBytes);

  // Producer key: pin the SPKI digest, then extract the raw 32-byte key.
  const spkiDer = pemToDer(inputs.producerPubkeyPem);
  const spkiSha = await sha256Hex(spkiDer);
  const keyPinOk = spkiSha === PRODUCER_SPKI_SHA256;
  journalChecks.push(
    check(
      "producer_key_pin",
      "Producer public key matches pinned digest",
      keyPinOk,
      `sha256(SPKI) = ${spkiSha.slice(0, 16)}…, pinned ${PRODUCER_SPKI_SHA256.slice(0, 16)}…`,
    ),
  );
  const producerKeyRaw = spkiDer.slice(-32);

  let prevManifestSha: string | null = null;
  let prevLineCount = 0;
  let prevGenTimes: string[] = [];

  const sorted = [...inputs.manifestFiles].sort((a, b) => a.stem.localeCompare(b.stem));
  for (let i = 0; i < sorted.length; i++) {
    const file = sorted[i];
    const checks: Check[] = [];
    const manifest = JSON.parse(new TextDecoder().decode(file.json)) as ReleaseManifest;

    // Canonical bytes: file must equal canonical JSON + one newline.
    const canonical = canonicalStringify(manifest) + "\n";
    const fileText = new TextDecoder().decode(file.json);
    checks.push(
      check(
        "canonical_bytes",
        "Manifest bytes are canonical JSON plus one newline",
        canonical === fileText,
        `${file.json.length} bytes`,
      ),
    );

    const manifestSha = await sha256Hex(file.json);
    const expectedStem = `${String(manifest.releaseIndex).padStart(4, "0")}-${manifestSha.slice(0, 16)}`;
    checks.push(
      check(
        "filename_digest",
        "Filename encodes the manifest digest",
        file.stem === expectedStem,
        `stem ${file.stem}, digest ${manifestSha.slice(0, 16)}`,
      ),
    );

    checks.push(
      check(
        "schema",
        "Schema and required fields",
        manifest.schemaVersion === "thesis_ledger_release_v1" &&
          typeof manifest.releaseIndex === "number" &&
          manifest.state?.path === "ledger/official_observations.jsonl",
        manifest.schemaVersion,
      ),
    );

    checks.push(
      check(
        "index_contiguous",
        "Release index is contiguous from zero",
        manifest.releaseIndex === i,
        `index ${manifest.releaseIndex} at position ${i}`,
      ),
    );

    checks.push(
      check(
        "chain_link",
        "Previous-manifest hash links the chain",
        manifest.previousManifestSha256 === prevManifestSha,
        prevManifestSha
          ? `expected ${prevManifestSha.slice(0, 16)}…`
          : "genesis: previousManifestSha256 is null",
      ),
    );

    // State commitment: the state at this release is the first lineCount
    // lines of the current journal (append-only implies prefix).
    const lineCount = manifest.state.lineCount;
    if (lineCount <= totalLines) {
      const stateBytes = inputs.journalBytes.slice(0, offsets[lineCount]);
      const stateSha = await sha256Hex(stateBytes);
      checks.push(
        check(
          "state_hash",
          `State hash covers journal lines 1–${lineCount}`,
          stateSha === manifest.state.jsonlSha256,
          `sha256 ${stateSha.slice(0, 16)}… vs manifest ${manifest.state.jsonlSha256.slice(0, 16)}…`,
        ),
      );
    } else {
      checks.push(
        check(
          "state_hash",
          "State line count fits the journal",
          false,
          `manifest claims ${lineCount} lines; journal has ${totalLines}`,
        ),
      );
    }

    if (i === sorted.length - 1) {
      checks.push(
        check(
          "head_state_current",
          "Head release covers the exact current journal bytes",
          manifest.state.jsonlSha256 === journalSha && lineCount === totalLines,
          `journal sha256 ${journalSha.slice(0, 16)}…, ${totalLines} lines`,
        ),
      );
      checks.push(
        check(
          "prefix_hash",
          "Immutable-prefix manifest hash matches committed bytes",
          manifest.state.immutablePrefixSha256 === prefixSha,
          `sha256 ${prefixSha.slice(0, 16)}…`,
        ),
      );
    }

    // Append block reconstruction.
    if (manifest.releaseIndex === 0) {
      checks.push(
        check(
          "append_block",
          "Genesis has a null append block",
          manifest.append === null,
          "genesis",
        ),
      );
    } else if (manifest.append) {
      const a = manifest.append;
      const rowsOk =
        a.previousLineCount === prevLineCount &&
        a.previousLineCount + a.appendedRowCount === lineCount;
      let suffixOk = false;
      let suffixDetail = "row counts inconsistent";
      if (rowsOk && lineCount <= totalLines) {
        const suffix = inputs.journalBytes.slice(
          offsets[a.previousLineCount],
          offsets[lineCount],
        );
        const suffixSha = await sha256Hex(suffix);
        suffixOk = suffixSha === a.appendedBytesSha256;
        suffixDetail = `suffix sha256 ${suffixSha.slice(0, 16)}… (${a.appendedRowCount} rows)`;
      }
      checks.push(
        check(
          "append_block",
          "Append block matches the exact byte suffix",
          rowsOk && suffixOk,
          suffixDetail,
        ),
      );
    } else {
      checks.push(
        check("append_block", "Non-genesis release has an append block", false, "missing"),
      );
    }

    // Producer signature.
    if (file.producerSig && keyPinOk) {
      let sigOk = false;
      let sigDetail = `${file.producerSig.length}-byte signature`;
      if (file.producerSig.length === 64) {
        try {
          sigOk = await inputs.verifyEd25519(file.producerSig, file.json, producerKeyRaw);
        } catch (e) {
          sigDetail = `verification error: ${String(e)}`;
        }
      } else {
        sigDetail = `expected 64 bytes, got ${file.producerSig.length}`;
      }
      checks.push(
        check(
          "producer_signature",
          "Ed25519 producer signature over exact manifest bytes",
          sigOk,
          sigDetail,
        ),
      );
    } else {
      checks.push(
        check(
          "producer_signature",
          "Ed25519 producer signature present",
          false,
          file.producerSig ? "producer key pin failed" : "signature file missing",
        ),
      );
    }

    // Receipts.
    const receipts: ReleaseVerification["receipts"] = [];
    const genTimes: string[] = [];
    for (const tsa of ["freetsa", "digicert"] as const) {
      const bytes = file[tsa];
      const rchecks: Check[] = [];
      let genTimeUtc: string | null = null;
      if (!bytes) {
        rchecks.push(check("receipt_present", `${tsa} receipt present`, false, "missing"));
      } else {
        try {
          const fields = parseTimestampResponse(bytes);
          genTimeUtc = fields.genTimeUtc;
          genTimes.push(fields.genTimeUtc);
          rchecks.push(
            check(
              "receipt_status",
              "Timestamp response status is granted",
              fields.pkiStatus === 0 || fields.pkiStatus === 1,
              `PKIStatus ${fields.pkiStatus}`,
            ),
          );
          rchecks.push(
            check(
              "receipt_imprint",
              "Receipt imprint is SHA-256 of the exact manifest bytes",
              fields.imprintAlgorithmOid === OID_SHA256 && fields.imprintHex === manifestSha,
              `imprint ${fields.imprintHex.slice(0, 16)}…`,
            ),
          );
          rchecks.push(
            check(
              "receipt_policy",
              "TSA policy OID matches the pinned policy",
              fields.policyOid === TSA_POLICY_OIDS[tsa],
              `policy ${fields.policyOid}`,
            ),
          );
        } catch (e) {
          rchecks.push(
            check("receipt_parse", "Receipt parses as RFC 3161 response", false, String(e)),
          );
        }
        rchecks.push(
          notChecked(
            "receipt_chain",
            "TSA signature chain to pinned root",
            "Browsers cannot verify the CMS signature chain here; run scripts/verify_release_chain.py --full offline.",
          ),
        );
      }
      receipts.push({ tsa, genTimeUtc, checks: rchecks });
    }

    // Chronology across releases (genTime must not decrease).
    if (prevGenTimes.length && genTimes.length) {
      const prevMax = [...prevGenTimes].sort().pop()!;
      const thisMin = [...genTimes].sort()[0];
      checks.push(
        check(
          "chronology",
          "Receipt times do not precede the previous release",
          thisMin >= prevMax,
          `${prevMax} → ${thisMin}`,
        ),
      );
    }

    releases.push({ stem: file.stem, manifest, checks, receipts });
    prevManifestSha = manifestSha;
    prevLineCount = lineCount;
    prevGenTimes = genTimes;
  }

  const all = [
    ...journalChecks,
    ...releases.flatMap((r) => [...r.checks, ...r.receipts.flatMap((x) => x.checks)]),
  ];
  return {
    releases,
    journalChecks,
    failures: all.filter((c) => c.status === "fail").length,
    browserChecked: all.filter((c) => c.status === "pass").length,
    notCheckedInBrowser: all.filter((c) => c.status === "not_checked_in_browser").length,
  };
}
