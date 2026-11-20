import { atomOf } from "@/lib/entitlement-value";
import { cn } from "@/lib/utils";

const TITLE_LIMIT = 4000;

function titleFor(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  return json.length > TITLE_LIMIT ? `${json.slice(0, TITLE_LIMIT)}\n…` : json;
}

function Atom({ atom, hit }: { atom: string; hit: boolean }) {
  return (
    <span
      className={cn(
        hit && "rounded-sm bg-primary/10 px-0.5 font-medium text-foreground",
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
    body = (
      <>
        {isList ? "[" : "{"}
        {ordered.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: items may repeat
          <span key={i}>
            {i > 0 && ", "}
            <Atom atom={item} hit={hits.has(item)} />
          </span>
        ))}
        {isList ? "]" : "}"}
      </>
    );
  } else {
    const atom = atomOf(value);
    body = (
      <Atom
        atom={typeof value === "string" ? `"${atom}"` : atom}
        hit={hits.has(atom)}
      />
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
      <span className="truncate">{body}</span>
      {count !== null && count > 1 && (
        <span className="shrink-0 rounded bg-muted px-1 tabular-nums">
          {count}
        </span>
      )}
    </span>
  );
}
