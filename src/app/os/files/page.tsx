"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileSystem from "@/components/filesystem";
import { createEngine } from "@/lib/engine";

export default function Files() {
  const params = useSearchParams();
  const os = params.get("os") as string;
  const [group, build] = os ? os.split("/") : ["", ""];

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  const [debouncedKeyword] = useDebounce(keyword, 200);

  useEffect(() => {
    setLoading(true);
    createEngine(group)
      .then((engine) => engine.getPaths(build))
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [group, build]);

  const filtered = useMemo(
    () =>
      files.filter((path) =>
        path.toLowerCase().includes(debouncedKeyword.toLowerCase())
      ),
    [debouncedKeyword, files]
  );

  const isFiltering = debouncedKeyword.length > 0;

  return (
    <div>
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
        {!loading && (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {isFiltering ? (
              <>
                {filtered.length} of {files.length} paths
              </>
            ) : (
              <>{files.length} paths</>
            )}
          </div>
        )}
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
          {files.length === 0 ? (
            <p>No paths found for this OS version.</p>
          ) : (
            <p>No paths match &quot;{keyword}&quot;</p>
          )}
        </div>
      ) : (
        <FileSystem os={os} list={filtered} expandAll={isFiltering} />
      )}
    </div>
  );
}
