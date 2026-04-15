"use client";

import { useState, useEffect, useMemo } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { Search, X, ChevronsUpDown, ChevronsDownUp } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileSystem from "@/components/filesystem";
import { HeaderPortal } from "@/components/header-portal";
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

  const filterControls = (
    <>
      <div className="relative flex-1 sm:flex-none sm:w-96">
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
      {!loading && paths.length > 0 && (
        <div className="flex items-center border border-border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandAll(true)}
            className="h-8 px-2 rounded-r-none"
            title="Expand All"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandAll(false)}
            className="h-8 px-2 rounded-l-none"
            title="Collapse All"
          >
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <HeaderPortal>{filterControls}</HeaderPortal>

      <div className="mb-3 shrink-0 flex items-baseline justify-between gap-4">
        <div>
          <span className="text-sm text-muted-foreground">Binaries with </span>
          <code className="text-sm break-all text-primary font-medium">{key}</code>
        </div>
        {!loading && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {isFiltering ? `${filtered.length} of ${paths.length}` : paths.length} paths
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
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
    </div>
  );
}
