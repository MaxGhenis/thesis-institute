"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";

export function CopyButton({
  text,
  label = "Copy citation",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1.5 border border-border-strong bg-paper px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-text-secondary hover:border-accent hover:text-accent"
      aria-live="polite"
    >
      {copied ? (
        <IconCheck size={14} aria-hidden />
      ) : (
        <IconCopy size={14} aria-hidden />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
