// Canonical JSON matching the journal's scripts/canonical_json.py, which is
// itself defined as "exactly what ECMAScript JSON.stringify produces" with
// object keys sorted by UTF-16 code units. In JavaScript that is native
// behavior: JSON.stringify for scalars and default Array.prototype.sort()
// (code-unit order) for keys.

export function canonicalStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string" || t === "boolean") return JSON.stringify(value);
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error(`Canonical JSON cannot serialize non-finite number: ${value}`);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const entries = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`,
    );
    return `{${entries.join(",")}}`;
  }
  throw new Error(`Canonical JSON cannot serialize value of type ${t}`);
}

export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalStringify(value));
}
