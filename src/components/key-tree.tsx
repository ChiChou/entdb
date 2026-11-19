"use client";

import { ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";

import type { NamespaceNode } from "@/lib/key-tree";
import { cn } from "@/lib/utils";

type Row = {
  node: NamespaceNode;
  depth: number;
  parent: string | null;
};

type NamespaceTreeProps = {
  tree: NamespaceNode;
  selected: string;
  onSelect: (ns: string) => void;
  isOpen: (ns: string) => boolean;
  onOpenChange: (ns: string, open: boolean) => void;
  className?: string;
};

/**
 * Single-column namespace navigator following the WAI-ARIA tree pattern:
 * ↑/↓ move, → expands or enters, ← collapses or goes to the parent,
 * Home/End jump, typing jumps to a matching name, and selection follows
 * focus.
 */
export function NamespaceTree({
  tree,
  selected,
  onSelect,
  isOpen,
  onOpenChange,
  className,
}: NamespaceTreeProps) {
  const rows = useMemo(() => {
    const out: Row[] = [{ node: tree, depth: 0, parent: null }];
    const walk = (node: NamespaceNode, depth: number) => {
      for (const child of node.children) {
        out.push({ node: child, depth, parent: node.ns });
        if (child.children.length > 0 && isOpen(child.ns)) {
          walk(child, depth + 1);
        }
      }
    };
    walk(tree, 1);
    return out;
  }, [tree, isOpen]);

  const items = useRef(new Map<string, HTMLDivElement>());
  const keyboardMove = useRef(false);

  // Move DOM focus only for keyboard navigation, never on URL/mouse changes.
  useEffect(() => {
    if (!keyboardMove.current) return;
    keyboardMove.current = false;
    const el = items.current.get(selected);
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // On mount (e.g. a shared `?ns=` link), scroll the selection into view
  // within the sidebar's own scroll box without moving the page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  useEffect(() => {
    const el = items.current.get(selected);
    const box = el?.closest("nav");
    if (!el || !box) return;
    const offset =
      el.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += offset - box.clientHeight / 3;
  }, []);

  const index = Math.max(
    0,
    rows.findIndex((row) => row.node.ns === selected),
  );

  const go = (ns: string | null | undefined) => {
    if (ns == null || ns === selected) return;
    keyboardMove.current = true;
    onSelect(ns);
  };

  // Type-ahead: typed characters within 600ms form a prefix; jump to the next
  // visible namespace whose label starts with it.
  const typeahead = useRef({ text: "", at: 0 });
  const findByPrefix = (char: string) => {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.at > 600 ? char : state.text + char;
    state.at = now;
    // Repeating one letter ("s", "s") cycles through matches for it; a
    // longer prefix keeps the current row while it still matches.
    const repeated = [...state.text].every((c) => c === char);
    const prefix = (repeated ? char : state.text).toLowerCase();
    const start = repeated ? index + 1 : index;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[(start + i) % rows.length];
      if (row.node.ns && row.node.label.toLowerCase().startsWith(prefix)) {
        return row.node.ns;
      }
    }
    return undefined;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key.length === 1 &&
      event.key !== " " &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      // Leave "/" to the page-level shortcut.
      if (event.key === "/") return;
      go(findByPrefix(event.key));
      event.preventDefault();
      return;
    }

    const row = rows[index];
    if (!row) return;
    const { node } = row;
    const expandable = node.children.length > 0 && node.ns !== "";
    const open = node.ns === "" || isOpen(node.ns);

    switch (event.key) {
      case "ArrowDown":
        go(rows[index + 1]?.node.ns);
        break;
      case "ArrowUp":
        go(rows[index - 1]?.node.ns);
        break;
      case "Home":
        go(rows[0].node.ns);
        break;
      case "End":
        go(rows[rows.length - 1].node.ns);
        break;
      case "ArrowRight":
        if (expandable && !open) onOpenChange(node.ns, true);
        else if (node.children.length > 0) go(node.children[0].ns);
        break;
      case "ArrowLeft":
        if (expandable && open) onOpenChange(node.ns, false);
        else go(row.parent);
        break;
      case "Enter":
      case " ":
        if (expandable) onOpenChange(node.ns, !open);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      role="tree"
      aria-label="Namespaces"
      onKeyDown={onKeyDown}
      className={cn("text-sm", className)}
    >
      {rows.map(({ node, depth }) => {
        const isRoot = node.ns === "";
        const expandable = node.children.length > 0 && !isRoot;
        const open = expandable && isOpen(node.ns);
        const active = node.ns === selected;

        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled by the role="tree" container (roving tabindex)
          <div
            key={node.ns || "(all)"}
            ref={(el) => {
              if (el) items.current.set(node.ns, el);
              else items.current.delete(node.ns);
            }}
            role="treeitem"
            aria-level={depth + 1}
            aria-selected={active}
            aria-expanded={expandable ? open : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(node.ns)}
            title={isRoot ? "All keys" : node.ns}
            style={{ paddingLeft: `${depth * 0.875 + 0.25}rem` }}
            className={cn(
              "group flex h-7 cursor-pointer select-none items-center gap-1 rounded-md pr-2 outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {expandable ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenChange(node.ns, !open);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    open && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <MiddleTruncate
              text={isRoot ? "All keys" : node.label}
              className={cn(
                "flex-1",
                !isRoot && "font-mono",
                active && "font-medium",
              )}
            />
            {node.marked > 0 && (
              <span
                className="shrink-0 rounded-full bg-emerald-50 px-1.5 text-xs tabular-nums text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                title={`${node.marked} new`}
              >
                +{node.marked}
              </span>
            )}
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
              {node.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Number of trailing characters kept visible when a label is shortened. */
const KEEP_TAIL = 8;

/**
 * Ellipsis in the middle (`authentication-s…ces-core`) so siblings sharing a
 * long prefix stay distinguishable. Pure CSS: only the head shrinks, and only
 * when the row is too narrow.
 */
function MiddleTruncate({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (text.length <= KEEP_TAIL * 2) {
    return <span className={cn("min-w-0 truncate", className)}>{text}</span>;
  }
  return (
    <span className={cn("flex min-w-0", className)}>
      <span className="truncate">{text.slice(0, -KEEP_TAIL)}</span>
      <span className="shrink-0 whitespace-pre">{text.slice(-KEEP_TAIL)}</span>
    </span>
  );
}
