"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import Link from "next/link";
import { Search, X, ChevronRight, ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { createEngine } from "@/lib/engine";

interface GroupedKeys {
  [prefix: string]: string[];
}

function groupKeysByPrefix(keys: string[]): GroupedKeys {
  const groups: GroupedKeys = {};

  for (const key of keys) {
    const parts = key.split(".");
    // Use first 3 segments for com.apple.*, otherwise use the whole key
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

function KeyBadge({
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
      className="inline-block px-2 py-1 bg-muted hover:bg-accent rounded text-sm font-mono transition-colors group"
      title={keyName}
    >
      {suffix ? (
        <>
          <span className="text-muted-foreground group-hover:text-muted-foreground/70 text-xs">
            {prefix}
          </span>
          <span className="text-foreground font-medium">{suffix}</span>
        </>
      ) : (
        <span className="text-foreground">{keyName}</span>
      )}
    </Link>
  );
}

function KeyGroup({
  prefix,
  keys,
  os,
  forceOpen,
}: {
  prefix: string;
  keys: string[];
  os: string;
  forceOpen: boolean | null;
}) {
  const [open, setOpen] = useState(forceOpen ?? keys.length <= 8);

  useEffect(() => {
    if (forceOpen !== null) {
      setOpen(forceOpen);
    }
  }, [forceOpen]);

  // Single key in group - just show it inline without collapsible wrapper
  if (keys.length === 1) {
    return (
      <div className="py-1">
        <KeyBadge keyName={keys[0]} prefix="" os={os} />
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="py-1">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors text-left">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="font-mono text-sm text-muted-foreground">
            {prefix}
            <span className="text-foreground font-medium">.*</span>
          </span>
          <span className="text-xs text-muted-foreground bg-background border px-1.5 py-0.5 rounded-full">
            {keys.length}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-6 pt-1.5 pb-2">
          {keys.map((key) => (
            <KeyBadge key={key} keyName={key} prefix={prefix} os={os} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Keys() {
  const params = useSearchParams();
  const os = params.get("os") as string;
  const [group, build] = os ? os.split("/") : ["", ""];

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);

  const [debouncedKeyword] = useDebounce(keyword, 200);

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

  const isFiltering = debouncedKeyword.length > 0;
  const hasGroups = sortedPrefixes.some(
    (p) => grouped[p].length > 1 || grouped[p][0] !== p
  );

  const handleExpandAll = useCallback(() => setForceOpen(true), []);
  const handleCollapseAll = useCallback(() => setForceOpen(false), []);

  // Reset forceOpen when filter changes
  useEffect(() => {
    setForceOpen(isFiltering ? true : null);
  }, [isFiltering]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
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
          {!loading && hasGroups && (
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
        <div className="space-y-0.5">
          {sortedPrefixes.map((prefix) => (
            <KeyGroup
              key={prefix}
              prefix={prefix}
              keys={grouped[prefix]}
              os={os}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
