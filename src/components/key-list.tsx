"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { type DisplayedKey, KeyLink } from "@/components/key-link";

/** Preferred column width: almost every full key fits on one line. */
const TARGET_COLUMN_PX = 560;
/** Two columns this narrow still beat one very wide column. */
const MIN_COLUMN_PX = 460;
const COLUMN_GAP_PX = 16;
/**
 * Rows per column within a block. Each block flows top-to-bottom through its
 * own columns, so a column is about one screen tall: an alphabetical list
 * reads down a column, across, then on to the next block, without scrolling
 * back up. Sizing blocks by the measured column count keeps columns even.
 */
const ROWS_PER_COLUMN = 24;
/** Blocks rendered immediately; the rest mount as they near the viewport. */
const EAGER_BLOCKS = 2;
/** Height placeholder for a block that hasn't mounted yet. */
const BLOCK_ESTIMATE_PX = ROWS_PER_COLUMN * 32;

export function KeyList({ entries }: { entries: DisplayedKey[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Measure before paint so the first frame already has the right columns.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const fit = (column: number) =>
        Math.floor((el.clientWidth + COLUMN_GAP_PX) / (column + COLUMN_GAP_PX));
      setColumns(
        Math.max(1, fit(TARGET_COLUMN_PX), Math.min(2, fit(MIN_COLUMN_PX))),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const blockSize = columns * ROWS_PER_COLUMN;
  const blocks: DisplayedKey[][] = [];
  for (let i = 0; i < entries.length; i += blockSize) {
    blocks.push(entries.slice(i, i + blockSize));
  }

  return (
    <div ref={ref} className="space-y-1">
      {blocks.map((block, i) => (
        <KeyBlock
          // Blocks are positional; keying by index keeps mounted blocks
          // mounted when the list changes.
          // biome-ignore lint/suspicious/noArrayIndexKey: positional blocks
          key={i}
          entries={block}
          columns={columns}
          eager={i < EAGER_BLOCKS}
        />
      ))}
    </div>
  );
}

function KeyBlock({
  entries,
  columns,
  eager,
}: {
  entries: DisplayedKey[];
  columns: number;
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
    <div ref={ref} style={{ columnCount: columns, columnGap: COLUMN_GAP_PX }}>
      {entries.map((entry) => (
        <KeyLink key={`${entry.status}:${entry.key}`} entry={entry} />
      ))}
    </div>
  );
}
