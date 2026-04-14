"use client";

import { useState, useEffect, useMemo } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileSystem from "@/components/filesystem";
import { createEngine } from "@/lib/engine";

export default function FindByKey() {
  const params = useSearchParams();
  const os = params.get("os");
  const key = params.get("key");

  const [group, build] = os ? os.split("/") : ["", ""];

  useEffect(() => {
    if (os && key) {
      document.title = `Find "${key}" in ${os} - Entitlement Database`;
    }
  });

  if (typeof os !== "string" || typeof key !== "string") {
    redirect("/404");
  }

  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  // Debounce keyword with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    async function fetchPaths() {
      if (!key) return;

      const engine = await createEngine(group);
      const result = await engine.getPathsForKey(build, key);
      setPaths(result);
    }
    setLoading(true);
    fetchPaths().finally(() => setLoading(false));
  }, [group, build, key]);

  const filtered = useMemo(
    () =>
      paths.filter((path) =>
        path.toLowerCase().includes(debouncedKeyword.toLowerCase())
      ),
    [debouncedKeyword, paths]
  );

  const isFiltering = debouncedKeyword.length > 0;

  // Reset expandAll when filter changes
  useEffect(() => {
    setExpandAll(isFiltering ? true : null);
  }, [isFiltering]);

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-foreground">
          Binaries that have the following entitlement:
        </h1>
        <p>
          <code className="text-sm break-all text-red-700 dark:text-red-400">{key}</code>
        </p>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter paths..."
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
          {!loading && paths.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandAll(true)}
                className="h-8 px-2 text-xs"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandAll(false)}
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
                  {filtered.length} of {paths.length} paths
                </>
              ) : (
                <>{paths.length} paths</>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div
                className="h-5 bg-muted rounded animate-pulse"
                style={{ width: `${120 + Math.random() * 200}px` }}
              />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {paths.length === 0 ? (
            <p>No binaries found with this entitlement.</p>
          ) : (
            <p>No paths match &quot;{keyword}&quot;</p>
          )}
        </div>
      ) : (
        <FileSystem os={os} list={filtered} expandAll={expandAll} />
      )}
    </div>
  );
}
