"use client";

import { useEffect, useRef, useState } from "react";

import { type DisplayedKey, KeyLink } from "@/components/key-link";

/**
 * Keys per block. Each block flows top-to-bottom through its own columns, so
 * a column is roughly one screen tall: an alphabetical list reads down a
 * column, across, then on to the next block, without ever having to scroll
 * back up.
 */
const BLOCK_SIZE = 60;
/** Blocks rendered immediately; the rest mount as they near the viewport. */
const EAGER_BLOCKS = 2;
/** Height placeholder for a block that hasn't mounted yet. */
const BLOCK_ESTIMATE_PX = 30 * 32;

export function KeyList({ entries }: { entries: DisplayedKey[] }) {
  const blocks: DisplayedKey[][] = [];
  for (let i = 0; i < entries.length; i += BLOCK_SIZE) {
    blocks.push(entries.slice(i, i + BLOCK_SIZE));
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => (
        <KeyBlock
          // Blocks are positional; keying by index keeps mounted blocks
          // mounted when the list changes.
          // biome-ignore lint/suspicious/noArrayIndexKey: positional blocks
          key={i}
          entries={block}
          eager={i < EAGER_BLOCKS}
        />
      ))}
    </div>
  );
}

function KeyBlock({
  entries,
  eager,
}: {
  entries: DisplayedKey[];
  eager: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  if (!visible) {
    return (
      <div ref={ref} aria-hidden="true" style={{ height: BLOCK_ESTIMATE_PX }} />
    );
  }

  return (
    <div ref={ref} className="columns-[26rem] gap-x-4">
      {entries.map((entry) => (
        <KeyLink key={`${entry.status}:${entry.key}`} entry={entry} />
      ))}
    </div>
  );
}
