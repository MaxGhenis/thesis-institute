// Minimal DER reader for RFC 3161 timestamp responses. This extracts the
// fields the in-browser verifier can honestly check — response status, TSA
// policy OID, message-imprint algorithm and digest, and genTime. It does NOT
// verify the CMS signature or the certificate chain; that is the offline
// verifier's job and the UI says so.

export interface DerNode {
  tag: number;
  constructed: boolean;
  tagClass: number; // 0 universal, 1 application, 2 context, 3 private
  tagNumber: number;
  start: number; // offset of tag byte
  contentStart: number;
  contentEnd: number;
}

export class DerReader {
  constructor(private bytes: Uint8Array) {}

  node(offset: number): DerNode {
    const b = this.bytes;
    if (offset >= b.length) throw new Error("DER: offset out of range");
    const tag = b[offset];
    const tagClass = tag >> 6;
    const constructed = (tag & 0x20) !== 0;
    const tagNumber = tag & 0x1f;
    if (tagNumber === 0x1f) throw new Error("DER: multi-byte tags unsupported");
    let cursor = offset + 1;
    let length = b[cursor];
    cursor += 1;
    if (length & 0x80) {
      const numBytes = length & 0x7f;
      if (numBytes === 0 || numBytes > 4) throw new Error("DER: bad length");
      length = 0;
      for (let i = 0; i < numBytes; i++) {
        length = length * 256 + b[cursor + i];
      }
      cursor += numBytes;
    }
    const contentEnd = cursor + length;
    if (contentEnd > b.length) throw new Error("DER: length overruns buffer");
    return {
      tag,
      constructed,
      tagClass,
      tagNumber,
      start: offset,
      contentStart: cursor,
      contentEnd,
    };
  }

  children(parent: DerNode): DerNode[] {
    const out: DerNode[] = [];
    let cursor = parent.contentStart;
    while (cursor < parent.contentEnd) {
      const child = this.node(cursor);
      out.push(child);
      cursor = child.contentEnd;
    }
    return out;
  }

  content(node: DerNode): Uint8Array {
    return this.bytes.slice(node.contentStart, node.contentEnd);
  }

  oid(node: DerNode): string {
    const c = this.content(node);
    if (c.length === 0) return "";
    const parts = [Math.floor(c[0] / 40), c[0] % 40];
    let value = 0;
    for (let i = 1; i < c.length; i++) {
      value = value * 128 + (c[i] & 0x7f);
      if ((c[i] & 0x80) === 0) {
        parts.push(value);
        value = 0;
      }
    }
    return parts.join(".");
  }

  integer(node: DerNode): number {
    const c = this.content(node);
    let v = 0;
    for (const byte of c) v = v * 256 + byte;
    return v;
  }
}

const OID_SIGNED_DATA = "1.2.840.113549.1.7.2";
const OID_TST_INFO = "1.2.840.113549.1.9.16.1.4";
export const OID_SHA256 = "2.16.840.1.101.3.4.2.1";

export interface TimestampReceiptFields {
  pkiStatus: number; // 0 = granted, 1 = grantedWithMods
  policyOid: string;
  imprintAlgorithmOid: string;
  imprintHex: string;
  genTimeUtc: string; // ISO-like, from GeneralizedTime
  serialNumber: number;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseGeneralizedTime(text: string): string {
  // e.g. "20260711141340Z" or with fractional seconds "20260711141340.123Z"
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/.exec(text);
  if (!m) throw new Error(`DER: unsupported GeneralizedTime: ${text}`);
  const frac = m[7] ? `.${m[7]}` : "";
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${frac}Z`;
}

/** Parse a DER RFC 3161 TimeStampResp into its displayable fields. */
export function parseTimestampResponse(bytes: Uint8Array): TimestampReceiptFields {
  const r = new DerReader(bytes);
  const root = r.node(0); // TimeStampResp ::= SEQUENCE
  const [statusInfo, token] = r.children(root);
  if (!statusInfo) throw new Error("DER: missing PKIStatusInfo");
  const statusChildren = r.children(statusInfo);
  const pkiStatus = r.integer(statusChildren[0]);
  if (!token) throw new Error("DER: response has no timeStampToken");

  // token: ContentInfo ::= SEQUENCE { contentType OID, [0] EXPLICIT content }
  const tokenChildren = r.children(token);
  const contentType = r.oid(tokenChildren[0]);
  if (contentType !== OID_SIGNED_DATA) {
    throw new Error(`DER: unexpected token content type ${contentType}`);
  }
  const signedData = r.children(tokenChildren[1])[0]; // SignedData SEQUENCE
  const sdChildren = r.children(signedData);
  // SignedData: version, digestAlgorithms, encapContentInfo, ...
  const encap = sdChildren[2];
  const encapChildren = r.children(encap);
  const eContentType = r.oid(encapChildren[0]);
  if (eContentType !== OID_TST_INFO) {
    throw new Error(`DER: unexpected eContentType ${eContentType}`);
  }
  const eContentWrapper = r.children(encapChildren[1])[0]; // OCTET STRING
  const tstBytes = r.content(eContentWrapper);

  const tr = new DerReader(tstBytes);
  const tst = tr.node(0); // TSTInfo ::= SEQUENCE
  const tstChildren = tr.children(tst);
  // version INTEGER, policy OID, messageImprint SEQUENCE, serialNumber
  // INTEGER, genTime GeneralizedTime, ...
  const policyOid = tr.oid(tstChildren[1]);
  const imprintChildren = tr.children(tstChildren[2]);
  const algChildren = tr.children(imprintChildren[0]);
  const imprintAlgorithmOid = tr.oid(algChildren[0]);
  const imprintHex = toHex(tr.content(imprintChildren[1]));
  const serialNumber = tr.integer(tstChildren[3]);
  const genTimeNode = tstChildren[4];
  if (genTimeNode.tagNumber !== 24) {
    throw new Error("DER: expected GeneralizedTime for genTime");
  }
  const genTimeUtc = parseGeneralizedTime(
    new TextDecoder().decode(tr.content(genTimeNode)),
  );
  return {
    pkiStatus,
    policyOid,
    imprintAlgorithmOid,
    imprintHex,
    genTimeUtc,
    serialNumber,
  };
}
