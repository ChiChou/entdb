"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { Search, X, ChevronRight, ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { createEngine } from "@/lib/engine";

interface GroupedKeys {
  [prefix: string]: string[];
}

function groupKeysByPrefix(keys: string[]): GroupedKeys {
  const groups: GroupedKeys = {};

  for (const key of keys) {
    const parts = key.split(".");
    let prefix: string;
    if (parts.length >= 3 && parts[0] === "com" && parts[1] === "apple") {
      prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
    } else if (parts.length >= 2) {
      prefix = `${parts[0]}.${parts[1]}`;
    } else {
      prefix = key;
    }

    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(key);
  }

  return groups;
}

const KeyBadge = memo(function KeyBadge({
  keyName,
  prefix,
  os,
}: {
  keyName: string;
  prefix: string;
  os: string;
}) {
  const suffix = keyName.startsWith(prefix + ".")
    ? keyName.slice(prefix.length)
    : keyName === prefix
      ? ""
      : keyName;

  return (
    <Link
      href={`/os/find?key=${encodeURIComponent(keyName)}&os=${os}`}
      className="block py-1 font-mono text-muted-foreground hover:text-foreground transition-colors group truncate"
      title={keyName}
    >
      {suffix ? (
        <>
          <span className="text-muted-foreground/60 group-hover:text-muted-foreground text-sm">
            {prefix}
          </span>
          <span className="text-foreground/80 group-hover:text-foreground">{suffix}</span>
        </>
      ) : (
        <span>{keyName}</span>
      )}
    </Link>
  );
});

interface RowItem {
  type: "header" | "keys" | "single";
  prefix: string;
  keys: string[];
  isOpen: boolean;
}

export default function Keys() {
  const params = useSearchParams();
  const os = params.get("os") as string;
  const [group, build] = os ? os.split("/") : ["", ""];

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce keyword with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    async function load() {
      const engine = await createEngine(group);
      const allKeys = await engine.getKeys(build);
      allKeys.sort((a, b) => a.localeCompare(b));
      setKeys(allKeys);
    }

    setLoading(true);
    load().finally(() => setLoading(false));
  }, [group, build]);

  const filtered = useMemo(
    () =>
      keys.filter((key) =>
        key.toLowerCase().includes(debouncedKeyword.toLowerCase())
      ),
    [debouncedKeyword, keys]
  );

  const grouped = useMemo(() => groupKeysByPrefix(filtered), [filtered]);
  const sortedPrefixes = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped]
  );

  // Build flat list of rows for virtualization
  const rows = useMemo(() => {
    const result: RowItem[] = [];
    for (const prefix of sortedPrefixes) {
      const keys = grouped[prefix];

      // Single key that equals its prefix - show as simple item, not collapsible
      if (keys.length === 1 && keys[0] === prefix) {
        result.push({
          type: "single",
          prefix,
          keys,
          isOpen: true,
        });
        continue;
      }

      const isOpen = openGroups.has(prefix) || keys.length <= 8 || debouncedKeyword.length > 0;

      result.push({
        type: "header",
        prefix,
        keys,
        isOpen,
      });

      if (isOpen) {
        result.push({
          type: "keys",
          prefix,
          keys,
          isOpen: true,
        });
      }
    }
    return result;
  }, [sortedPrefixes, grouped, openGroups, debouncedKeyword]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row.type === "single") return 36;
      if (row.type === "header") return 40;
      // Estimate based on number of keys (3 columns, ~32px per row)
      const keyRows = Math.ceil(row.keys.length / 3);
      return keyRows * 32 + 24; // padding
    },
    overscan: 5,
  });

  const isFiltering = debouncedKeyword.length > 0;

  const toggleGroup = useCallback((prefix: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setOpenGroups(new Set(sortedPrefixes));
  }, [sortedPrefixes]);

  const handleCollapseAll = useCallback(() => {
    setOpenGroups(new Set());
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter entitlement keys..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9 pr-9"
          />
          {keyword && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKeyword("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!loading && sortedPrefixes.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExpandAll}
                className="h-8 px-2 text-xs"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCollapseAll}
                className="h-8 px-2 text-xs"
              >
                Collapse All
              </Button>
            </div>
          )}
          {!loading && (
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {isFiltering ? (
                <>
                  {filtered.length} of {keys.length} keys
                </>
              ) : (
                <>{keys.length} entitlement keys</>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[
            { prefix: 180, items: [140, 160, 120] },
            { prefix: 220, items: [180, 140, 200, 160] },
            { prefix: 160, items: [120, 180] },
            { prefix: 200, items: [160, 140, 180, 120, 200] },
            { prefix: 140, items: [100, 140, 120] },
            { prefix: 240, items: [180, 160, 200, 140] },
          ].map((group, index) => (
            <div
              key={index}
              className="space-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div
                  className="h-5 bg-muted rounded animate-pulse"
                  style={{ width: group.prefix }}
                />
                <div className="h-4 w-8 bg-muted rounded-full animate-pulse ml-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-6">
                {group.items.map((width, i) => (
                  <div
                    key={i}
                    className="h-8 bg-muted rounded animate-pulse"
                    style={{
                      width,
                      animationDelay: `${index * 100 + i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {keys.length === 0 ? (
            <p>No entitlement keys found for this OS version.</p>
          ) : (
            <p>No keys match &quot;{keyword}&quot;</p>
          )}
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 min-h-0 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];

              if (row.type === "single") {
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="px-2 py-1"
                  >
                    <KeyBadge keyName={row.keys[0]} prefix="" os={os} />
                  </div>
                );
              }

              if (row.type === "header") {
                const isOpen = row.isOpen;
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      onClick={() => toggleGroup(row.prefix)}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-accent rounded transition-colors text-left w-full"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-mono text-sm text-muted-foreground">
                        {row.prefix}
                        <span className="text-foreground font-medium">.*</span>
                      </span>
                      <span className="text-xs text-muted-foreground bg-background border px-1.5 py-0.5 rounded-full">
                        {row.keys.length}
                      </span>
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 pl-8 pr-2 pb-3">
                    {row.keys.map((key) => (
                      <KeyBadge key={key} keyName={key} prefix={row.prefix} os={os} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
