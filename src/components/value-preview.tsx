import { atomOf } from "@/lib/entitlement-value";
import { cn } from "@/lib/utils";

const TITLE_LIMIT = 4000;

function titleFor(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  return json.length > TITLE_LIMIT ? `${json.slice(0, TITLE_LIMIT)}\n…` : json;
}

/**
 * One value item as a chip, so values never read as part of the path.
 * With `onPick` it's a button that toggles the item in the value filter.
 */
function Atom({
  atom,
  hit,
  onPick,
}: {
  atom: string;
  hit: boolean;
  onPick?: (atom: string) => void;
}) {
  const className = cn(
    "shrink-0 rounded px-1.5 leading-5",
    hit
      ? "bg-value font-medium text-background"
      : "bg-value/8 text-value ring-1 ring-inset ring-value/15",
  );
  if (!onPick) return <span className={className}>{atom}</span>;
  return (
    <button
      type="button"
      onClick={() => onPick(atom)}
      className={cn(
        className,
        "cursor-pointer transition-colors",
        hit ? "hover:bg-value/85" : "hover:bg-value/15",
      )}
      title={hit ? `Remove ${atom} from the filter` : `Filter by ${atom}`}
    >
      {atom}
    </button>
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
  onPick,
  className,
}: {
  value: unknown;
  highlight: readonly string[];
  /** Toggles an item in the value filter; chips are buttons when set. */
  onPick?: (atom: string) => void;
  className?: string;
}) {
  const hits = new Set(highlight);
  const isList = Array.isArray(value);
  const isDict = !isList && value !== null && typeof value === "object";

  let body: React.ReactNode;
  let count: number | null = null;
  if (isList || isDict) {
    // Nested arrays/dicts show as JSON and aren't atoms, so not pickable.
    const items = isList
      ? (value as unknown[]).map((item) =>
          item !== null && typeof item === "object"
            ? { text: JSON.stringify(item), atom: false }
            : { text: atomOf(item), atom: true },
        )
      : Object.keys(value as object).map((key) => ({ text: key, atom: true }));
    count = items.length;
    const ordered = [
      ...items.filter((item) => hits.has(item.text)),
      ...items.filter((item) => !hits.has(item.text)),
    ];
    body = ordered.map((item, i) => (
      <Atom
        // biome-ignore lint/suspicious/noArrayIndexKey: items may repeat
        key={i}
        atom={item.text}
        hit={hits.has(item.text)}
        onPick={item.atom ? onPick : undefined}
      />
    ));
  } else {
    const atom = atomOf(value);
    body = (
      // The chip already sets it apart, so strings need no quotes.
      <Atom atom={atom} hit={hits.has(atom)} onPick={onPick} />
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
