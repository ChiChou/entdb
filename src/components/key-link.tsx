"use client";

import { Check, Copy, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { basePath } from "@/lib/env";
import {
  KEY_TRANSITION_NAME,
  canAnimateNavigation,
  navigateWithTransition,
  rememberKeysPage,
} from "@/lib/key-navigation";
import { cn } from "@/lib/utils";

/** router.push() adds basePath itself, so store paths without it. */
function withoutBasePath(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length)
    : path;
}

export type DisplayedKey = {
  key: string;
  os: string;
  status: "current" | "added" | "removed";
  /** Version being compared against, carried over to the find page. */
  diff?: string;
};

function findHref(entry: DisplayedKey) {
  const query = new URLSearchParams({ key: entry.key, os: entry.os });
  if (entry.diff) query.set("diff", entry.diff);
  return `/os/find?${query.toString()}`;
}

export function KeyLink({ entry }: { entry: DisplayedKey }) {
  const isNew = entry.status === "added";
  const isRemoved = entry.status === "removed";
  const router = useRouter();
  const labelRef = useRef<HTMLSpanElement>(null);
  const href = findHref(entry);

  return (
    <div
      className={cn(
        "group relative mb-1 break-inside-avoid rounded-md transition-colors",
        isNew
          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
          : isRemoved
            ? "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            : "text-foreground hover:bg-accent",
      )}
    >
      <Link
        href={href}
        data-nav-item
        onClick={(event) => {
          // Remember exactly where we were, for the find page's back link.
          rememberKeysPage({
            url:
              withoutBasePath(window.location.pathname) +
              window.location.search,
            key: entry.key,
            os: entry.os,
            scrollY: window.scrollY,
          });
          if (!canAnimateNavigation(event) || !labelRef.current) return;
          // Morph this key name into the find page title.
          event.preventDefault();
          labelRef.current.style.viewTransitionName = KEY_TRANSITION_NAME;
          navigateWithTransition(() => router.push(href), "[data-key-title]");
        }}
        className="flex min-w-0 items-start gap-2 rounded-md py-1 pl-1 pr-7 font-mono text-sm leading-5"
        title={entry.key}
        onKeyDown={(event) => {
          // ⌘C / Ctrl+C on a focused key copies it (unless text is selected).
          if (
            event.key === "c" &&
            (event.metaKey || event.ctrlKey) &&
            !window.getSelection()?.toString()
          ) {
            event.preventDefault();
            void navigator.clipboard.writeText(entry.key);
          }
        }}
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
        <span ref={labelRef} className="min-w-0">
          <KeyLabel
            text={entry.key}
            // Marked rows keep their green/red; only fade the prefix.
            prefixClassName={isNew || isRemoved ? "opacity-70" : undefined}
          />
        </span>
      </Link>
      <CopyKey text={entry.key} />
    </div>
  );
}

/**
 * Icon button revealed on row hover. Kept out of the tab order so keys don't
 * cost two stops each; keyboard users copy with ⌘C / Ctrl+C on the link.
 */
function CopyKey({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => setCopied(true))
          .catch(() => {});
      }}
      aria-label={copied ? "Copied" : `Copy ${text}`}
      title={copied ? "Copied" : "Copy key"}
      className={cn(
        "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-background hover:text-foreground",
        copied
          ? "opacity-100 text-emerald-600 dark:text-emerald-400"
          : "opacity-0 group-hover:opacity-100",
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/**
 * Dotted name that wraps at `.`/`-`/`_` boundaries instead of truncating, with
 * the namespace head dimmed so the most specific (last) segment stands out.
 */
export function KeyLabel({
  text,
  className,
  prefixClassName = "text-key-prefix",
}: {
  text: string;
  className?: string;
  /** Style of the namespace part before the last dot. */
  prefixClassName?: string;
}) {
  // Stray leading/trailing spaces are real (typos in shipped entitlements)
  // and change the key's meaning, so show them instead of letting them vanish.
  const lead = text.length - text.trimStart().length;
  const trail = text.length - text.trimEnd().length;
  const body = text.trim();
  const cut = body.lastIndexOf(".", body.length - 2);
  const head = cut > 0 ? body.slice(0, cut + 1) : "";
  const tail = cut > 0 ? body.slice(cut + 1) : body;
  return (
    <span
      className={cn(
        "min-w-0 [overflow-wrap:anywhere] pl-4 -indent-4",
        className,
      )}
    >
      {lead > 0 && <StraySpace count={lead} where="Leading" />}
      {head && <span className={prefixClassName}>{withBreaks(head)}</span>}
      {withBreaks(tail)}
      {trail > 0 && <StraySpace count={trail} where="Trailing" />}
    </span>
  );
}

export function StraySpace({
  count,
  where,
}: {
  count: number;
  where: "Leading" | "Trailing";
}) {
  const label = `${where} space${count > 1 ? "s" : ""} in key`;
  return (
    <span
      className="text-amber-600 dark:text-amber-400"
      title={label}
      aria-label={label}
    >
      {"␣".repeat(count)}
    </span>
  );
}

/** Insert soft break opportunities after separators. */
function withBreaks(text: string) {
  const parts = text.split(/(?<=[.\-_])/);
  // Plain text nodes with <wbr> between them: no wrapper element per segment.
  return parts.flatMap((part, i) =>
    // biome-ignore lint/suspicious/noArrayIndexKey: static split of a string
    i === 0 ? [part] : [<wbr key={i} />, part],
  );
}
