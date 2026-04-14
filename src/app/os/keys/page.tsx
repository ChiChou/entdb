"use client";

import { useState, useEffect, useMemo } from "react";
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
      className="inline-flex items-baseline px-2 py-1 bg-muted hover:bg-accent rounded text-sm font-mono transition-colors group"
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
  defaultOpen,
}: {
  prefix: string;
  keys: string[];
  os: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Single standalone key - just show it inline
  if (keys.length === 1 && keys[0] === prefix) {
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
        <div className="flex flex-wrap gap-1.5 pl-6 pt-1.5 pb-2">
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div
                className="h-6 bg-muted rounded animate-pulse"
                style={{ width: `${20 + Math.random() * 30}%` }}
              />
              <div className="flex flex-wrap gap-1.5 pl-6">
                {Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="h-7 bg-muted rounded animate-pulse"
                      style={{ width: `${80 + Math.random() * 120}px` }}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {keys.length === 0 ? (
            <p>No entitlement keys found for this OS version.</p>
          ) : (
            <p>No keys match "{keyword}"</p>
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
              defaultOpen={isFiltering || grouped[prefix].length <= 8}
            />
          ))}
        </div>
      )}
    </div>
  );
}
