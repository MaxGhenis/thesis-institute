export type StampTone = "neutral" | "witness" | "flag" | "open";

export function Stamp({
  tone,
  children,
  title,
}: {
  tone: StampTone;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span className={`stamp stamp-${tone}`} title={title}>
      {children}
    </span>
  );
}
