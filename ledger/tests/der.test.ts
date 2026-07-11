import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { OID_SHA256, parseTimestampResponse } from "@/lib/verify/der";

const MANIFESTS = path.join(__dirname, "../data/journal/releases/manifests");
const STEM = "0000-307cedbc91de43be";

const manifestBytes = fs.readFileSync(path.join(MANIFESTS, `${STEM}.json`));
const manifestSha = crypto.createHash("sha256").update(manifestBytes).digest("hex");

describe("parseTimestampResponse on the real genesis receipts", () => {
  for (const tsa of ["freetsa", "digicert"] as const) {
    it(`extracts ${tsa} imprint, policy, and genTime`, () => {
      const bytes = new Uint8Array(
        fs.readFileSync(path.join(MANIFESTS, `${STEM}.${tsa}.tsr`)),
      );
      const fields = parseTimestampResponse(bytes);
      expect(fields.pkiStatus).toBe(0);
      expect(fields.imprintAlgorithmOid).toBe(OID_SHA256);
      expect(fields.imprintHex).toBe(manifestSha);
      expect(fields.genTimeUtc.startsWith("2026-07-11T14:13:")).toBe(true);
      expect(fields.policyOid).toBe(
        tsa === "freetsa" ? "1.2.3.4.1" : "2.16.840.1.114412.7.1",
      );
    });
  }

  it("rejects garbage", () => {
    expect(() => parseTimestampResponse(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
