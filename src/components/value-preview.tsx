import { atomOf } from "@/lib/entitlement-value";
import { cn } from "@/lib/utils";

const TITLE_LIMIT = 4000;

function titleFor(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  return json.length > TITLE_LIMIT ? `${json.slice(0, TITLE_LIMIT)}\n…` : json;
}

/** One value item as a chip, so values never read as part of the path. */
function Atom({ atom, hit }: { atom: string; hit: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 leading-5",
        hit
          ? "bg-value font-medium text-background"
          : "bg-value/8 text-value ring-1 ring-inset ring-value/15",
      )}
    >
      {atom}
    </span>
  );
}

/**
 * One-line summary of an entitlement value, for a tree row. Array items and
 * dict keys that match the active value filter come first and are marked, so
 * the reason a binary matched is visible even when the list is truncated.
 */
export function ValuePreview({
  value,
  highlight,
  className,
}: {
  value: unknown;
  highlight: readonly string[];
  className?: string;
}) {
  const hits = new Set(highlight);
  const isList = Array.isArray(value);
  const isDict = !isList && value !== null && typeof value === "object";

  let body: React.ReactNode;
  let count: number | null = null;
  if (isList || isDict) {
    const items = isList
      ? (value as unknown[]).map((item) =>
          item !== null && typeof item === "object"
            ? JSON.stringify(item)
            : atomOf(item),
        )
      : Object.keys(value as object);
    count = items.length;
    const ordered = [
      ...items.filter((item) => hits.has(item)),
      ...items.filter((item) => !hits.has(item)),
    ];
    body = ordered.map((item, i) => (
      <Atom
        // biome-ignore lint/suspicious/noArrayIndexKey: items may repeat
        key={i}
        atom={item}
        hit={hits.has(item)}
      />
    ));
  } else {
    const atom = atomOf(value);
    body = (
      // The chip already sets it apart, so strings need no quotes.
      <Atom atom={atom} hit={hits.has(atom)} />
    );
  }

  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground",
        className,
      )}
      title={titleFor(value)}
    >
      {/* Chips that don't fit are clipped; the count says how many. */}
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {body}
      </span>
      {count !== null && count > 1 && (
        <span
          className="shrink-0 tabular-nums text-muted-foreground"
          title={`${count} ${isDict ? "keys" : "items"}`}
        >
          {count}
        </span>
      )}
    </span>
  );
}
