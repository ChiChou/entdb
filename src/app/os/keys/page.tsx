"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createEngine } from "@/lib/engine";

export default function Keys() {
  const params = useSearchParams();
  const os = params.get("os") as string;
  const [group, build] = os ? os.split("/") : ["", ""];

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

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

  const isFiltering = debouncedKeyword.length > 0;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
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
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {filtered.map((key) => (
              <Link
                key={key}
                href={`/os/find?key=${encodeURIComponent(key)}&os=${os}`}
                className="block py-1 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                title={key}
              >
                {key}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
