"use client";

import { Braces, Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { VALUE_FILTER_ATTR } from "@/components/keyboard-shortcuts";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countAtoms, matchesAtoms } from "@/lib/entitlement-value";
import { cn } from "@/lib/utils";

/** Rendering thousands of cmdk items is slow; typing narrows the rest. */
const MAX_SUGGESTIONS = 150;

/**
 * "Value contains …" filter with suggestions drawn from this key's values.
 * Selecting several atoms means all of them (AND); the counts are faceted,
 * so they always say how many binaries would remain after adding that atom.
 */
export function ValueFilter({
  values,
  selected,
  onChange,
}: {
  /** Every binary's value for the key. */
  values: unknown[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const facets = useMemo(
    () => countAtoms(values.filter((value) => matchesAtoms(value, selected))),
    [values, selected],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rest = facets.filter(({ atom }) => !selected.includes(atom));
    if (!q) return rest;
    // Prefix matches first, then anywhere; each keeps the count order.
    const prefix = [];
    const inner = [];
    for (const facet of rest) {
      const index = facet.atom.toLowerCase().indexOf(q);
      if (index === 0) prefix.push(facet);
      else if (index > 0) inner.push(facet);
    }
    return [...prefix, ...inner];
  }, [facets, query, selected]);

  const toggle = (atom: string) => {
    onChange(
      selected.includes(atom)
        ? selected.filter((a) => a !== atom)
        : [...selected, atom],
    );
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          {...{ [VALUE_FILTER_ATTR]: "" }}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors hover:bg-accent",
            selected.length > 0
              ? "border-primary/40 text-foreground"
              : "text-muted-foreground",
          )}
          title="Filter by value (=)"
        >
          <Braces className="h-3.5 w-3.5" />
          Value
          {selected.length > 0 && (
            <span className="rounded bg-primary px-1 tabular-nums text-[11px] leading-4 text-primary-foreground">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(28rem,calc(100vw-2rem))] p-0"
        align="end"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Value contains…"
            onKeyDown={(e) => {
              // Backspace on an empty query drops the last condition.
              if (e.key === "Backspace" && !query && selected.length > 0) {
                e.preventDefault();
                onChange(selected.slice(0, -1));
              }
            }}
          />
          <CommandList className="max-h-[min(22rem,60vh)]">
            <CommandEmpty>
              {facets.length === 0 ? "No binaries match." : "No such value."}
            </CommandEmpty>
            {/* Hidden while typing, so Enter picks a match, not these. */}
            {!query &&
              selected.map((atom) => (
                <CommandItem
                  key={`selected:${atom}`}
                  value={`selected:${atom}`}
                  onSelect={() => toggle(atom)}
                  className="gap-2"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {atom}
                  </span>
                </CommandItem>
              ))}
            {suggestions.slice(0, MAX_SUGGESTIONS).map(({ atom, count }) => (
              <CommandItem
                key={atom}
                value={atom}
                onSelect={() => toggle(atom)}
                className="gap-2"
              >
                <span className="h-3.5 w-3.5 shrink-0" />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs"
                  title={atom}
                >
                  {atom}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </CommandItem>
            ))}
            {suggestions.length > MAX_SUGGESTIONS && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {suggestions.length - MAX_SUGGESTIONS} more — type to narrow
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The active value conditions, on their own row under the key header so
 * adding one never reflows the header controls.
 */
export function ValueConditions({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  if (selected.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Value contains</span>
      {selected.map((atom, i) => (
        <span key={atom} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground">and</span>}
          <span
            className="inline-flex h-6 min-w-0 max-w-[20rem] items-center gap-0.5 rounded-md bg-primary/10 pl-2 pr-0.5 font-mono"
            title={atom}
          >
            <span className="truncate">{atom}</span>
            <button
              type="button"
              onClick={() => onChange(selected.filter((a) => a !== atom))}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Remove ${atom}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange([])}
        className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        Clear
      </button>
    </div>
  );
}
