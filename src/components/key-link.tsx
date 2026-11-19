import { Minus, Plus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type DisplayedKey = {
  key: string;
  os: string;
  status: "current" | "added" | "removed";
};

export function KeyLink({ entry }: { entry: DisplayedKey }) {
  const isNew = entry.status === "added";
  const isRemoved = entry.status === "removed";

  return (
    <Link
      href={`/os/find?key=${encodeURIComponent(
        entry.key,
      )}&os=${encodeURIComponent(entry.os)}`}
      className={cn(
        "group mb-1 flex min-w-0 break-inside-avoid items-start gap-2 rounded-md px-1 py-1 font-mono text-sm leading-5 transition-colors",
        isNew
          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
          : isRemoved
            ? "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
      title={entry.key}
    >
      {(isNew || isRemoved) && (
        <span
          aria-label={isRemoved ? "Removed" : "New"}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            isRemoved
              ? "border-red-300/70 text-red-700 dark:border-red-700 dark:text-red-300"
              : "border-emerald-300/70 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
          )}
          title={isRemoved ? "Removed" : "New"}
        >
          {isRemoved ? (
            <Minus className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Plus className="h-3 w-3" aria-hidden="true" />
          )}
        </span>
      )}
      <KeyLabel text={entry.key} />
    </Link>
  );
}

/**
 * Dotted name that wraps at `.`/`-`/`_` boundaries instead of truncating, with
 * the namespace head dimmed so the most specific (last) segment stands out.
 */
export function KeyLabel({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const cut = text.lastIndexOf(".", text.length - 2);
  const head = cut > 0 ? text.slice(0, cut + 1) : "";
  const tail = cut > 0 ? text.slice(cut + 1) : text;
  return (
    <span
      className={cn(
        "min-w-0 [overflow-wrap:anywhere] pl-4 -indent-4",
        className,
      )}
    >
      {head && <span className="opacity-60">{withBreaks(head)}</span>}
      {withBreaks(tail)}
    </span>
  );
}

/** Insert soft break opportunities after separators. */
function withBreaks(text: string) {
  const parts = text.split(/(?<=[.\-_])/);
  return parts.map((part, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static split of a string
    <span key={i}>
      {part}
      {i < parts.length - 1 && <wbr />}
    </span>
  ));
}
