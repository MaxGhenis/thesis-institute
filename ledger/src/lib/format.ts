// Value and label rendering. Values are shown exactly as recorded — the
// formatter adds thousands separators for readability but never rescales,
// rounds, or converts a recorded value.

const UNIT_SUFFIX: Record<string, string> = {
  percent: "%",
  percent_growth: "% growth",
};

const UNIT_LABEL: Record<string, string> = {
  thousands: "thousands",
  millions: "millions",
  usd: "USD",
  usd_billions: "USD billions",
  gbp_billions: "GBP billions",
  count: "count",
  index_points: "index points",
};

export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  // Preserve recorded precision: toLocaleString with enough digits.
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function formatValueWithUnit(
  value: number | null | undefined,
  unit: string | null | undefined,
  scale?: string | null,
): string {
  const v = formatValue(value);
  if (value === null || value === undefined) return v;
  if (unit && UNIT_SUFFIX[unit]) return `${v}${UNIT_SUFFIX[unit]}`;
  const unitLabel = unit ? (UNIT_LABEL[unit] ?? unit) : "";
  const scaleLabel = scale && scale !== "unit" ? ` (${scale})` : "";
  return unitLabel ? `${v} ${unitLabel}${scaleLabel}` : `${v}${scaleLabel}`;
}

export function formatPeriod(
  type: string | null | undefined,
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  const v = String(value);
  switch (type) {
    case "calendar_year":
      return `CY ${v}`;
    case "tax_year":
      return `TY ${v}`;
    case "fiscal_year":
      return `FY ${v}`;
    case "month":
    case "week_ending":
    case "quarter":
    case "level":
    case "year":
      return v;
    default:
      return type ? `${v} (${type})` : v;
  }
}

export function truncateHash(hash: string, chars = 12): string {
  return hash.length <= chars ? hash : `${hash.slice(0, chars)}…`;
}

export function formatBytes(n: number | undefined | null): string {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUtc(iso: string | undefined | null): string {
  if (!iso) return "—";
  return iso.replace("T", " ").replace("Z", " UTC");
}
