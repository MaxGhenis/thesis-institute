import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as ed from "@noble/ed25519";
import { verifyChain, type ChainInputs } from "@/lib/verify/chain";

const DATA = path.join(__dirname, "../data/journal");
const MANIFESTS = path.join(DATA, "releases/manifests");
const STEM = "0000-307cedbc91de43be";

function realInputs(): ChainInputs {
  return {
    manifestFiles: [
      {
        stem: STEM,
        json: new Uint8Array(fs.readFileSync(path.join(MANIFESTS, `${STEM}.json`))),
        freetsa: new Uint8Array(
          fs.readFileSync(path.join(MANIFESTS, `${STEM}.freetsa.tsr`)),
        ),
        digicert: new Uint8Array(
          fs.readFileSync(path.join(MANIFESTS, `${STEM}.digicert.tsr`)),
        ),
        producerSig: new Uint8Array(
          fs.readFileSync(path.join(MANIFESTS, `${STEM}.producer.sig`)),
        ),
      },
    ],
    journalBytes: new Uint8Array(
      fs.readFileSync(path.join(DATA, "official_observations.jsonl")),
    ),
    prefixBytes: new Uint8Array(
      fs.readFileSync(path.join(DATA, "immutable_prefix.json")),
    ),
    producerPubkeyPem: fs.readFileSync(
      path.join(DATA, "releases/anchors/producer-ed25519.pub"),
      "utf-8",
    ),
    verifyEd25519: (sig, msg, pub) => ed.verifyAsync(sig, msg, pub),
  };
}

describe("verifyChain on the vendored genesis release", () => {
  it("passes every browser-checkable invariant", async () => {
    const result = await verifyChain(realInputs());
    const failed = [
      ...result.journalChecks,
      ...result.releases.flatMap((r) => [
        ...r.checks,
        ...r.receipts.flatMap((x) => x.checks),
      ]),
    ].filter((c) => c.status === "fail");
    expect(failed).toEqual([]);
    expect(result.failures).toBe(0);
    expect(result.browserChecked).toBeGreaterThanOrEqual(12);
    // The CMS signature chains are exactly the two not-in-browser checks.
    expect(result.notCheckedInBrowser).toBe(2);
  });

  it("fails the state check when a journal byte is tampered", async () => {
    const inputs = realInputs();
    const tampered = new Uint8Array(inputs.journalBytes);
    tampered[100] = tampered[100] === 0x30 ? 0x31 : 0x30;
    inputs.journalBytes = tampered;
    const result = await verifyChain(inputs);
    expect(result.failures).toBeGreaterThan(0);
    const stateCheck = result.releases[0].checks.find((c) => c.id === "state_hash");
    expect(stateCheck?.status).toBe("fail");
  });

  it("fails the producer-signature check when the manifest is re-signed by another key", async () => {
    const inputs = realInputs();
    inputs.manifestFiles[0].producerSig = new Uint8Array(64); // zero signature
    const result = await verifyChain(inputs);
    const sigCheck = result.releases[0].checks.find(
      (c) => c.id === "producer_signature",
    );
    expect(sigCheck?.status).toBe("fail");
  });

  it("verifies a synthetic witnessed append suffix", async () => {
    // Build release 1 over the real journal plus one appended row, checking
    // the append-reconstruction path that is dormant while only genesis
    // exists. Receipts and signature are absent, so those checks fail — the
    // point is that the structural chain and suffix hashing pass.
    const { canonicalStringify } = await import("@/lib/verify/canonical");
    const crypto = await import("node:crypto");
    const inputs = realInputs();
    const appendRow = Buffer.from(`${JSON.stringify({ synthetic: true })}\n`);
    const journal2 = Buffer.concat([Buffer.from(inputs.journalBytes), appendRow]);
    const genesis = JSON.parse(
      Buffer.from(inputs.manifestFiles[0].json).toString("utf-8"),
    );
    const genesisSha = crypto
      .createHash("sha256")
      .update(Buffer.from(inputs.manifestFiles[0].json))
      .digest("hex");
    const manifest1 = {
      schemaVersion: "thesis_ledger_release_v1",
      releaseIndex: 1,
      previousManifestSha256: genesisSha,
      createdAtUtc: "2026-07-12T13:40:00Z",
      producer: genesis.producer,
      state: {
        path: "ledger/official_observations.jsonl",
        jsonlSha256: crypto.createHash("sha256").update(journal2).digest("hex"),
        lineCount: genesis.state.lineCount + 1,
        immutablePrefixSha256: genesis.state.immutablePrefixSha256,
      },
      append: {
        previousLineCount: genesis.state.lineCount,
        appendedRowCount: 1,
        appendedBytesSha256: crypto
          .createHash("sha256")
          .update(appendRow)
          .digest("hex"),
      },
    };
    const manifest1Bytes = Buffer.from(canonicalStringify(manifest1) + "\n");
    const manifest1Sha = crypto
      .createHash("sha256")
      .update(manifest1Bytes)
      .digest("hex");
    inputs.manifestFiles.push({
      stem: `0001-${manifest1Sha.slice(0, 16)}`,
      json: new Uint8Array(manifest1Bytes),
      freetsa: null,
      digicert: null,
      producerSig: null,
    });
    inputs.journalBytes = new Uint8Array(journal2);

    const result = await verifyChain(inputs);
    const release1 = result.releases[1];
    for (const id of [
      "canonical_bytes",
      "filename_digest",
      "chain_link",
      "state_hash",
      "append_block",
      "head_state_current",
    ]) {
      const c = release1.checks.find((x) => x.id === id);
      expect(c?.status, id).toBe("pass");
    }
  });
});
