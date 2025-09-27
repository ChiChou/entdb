"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import Link from "next/link";

import { addBasePath } from "@/lib/env";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { create } from "@/lib/kv";

export default function Keys() {
  const params = useSearchParams();
  const os = params.get("os") as string;

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  const [value] = useDebounce(keyword, 200);

  useEffect(() => {
    async function load() {
      const reader = await create(addBasePath(`/data/${os}/keys`));

      setKeys([...reader.keys()]);
    }

    setLoading(true);
    load().finally(() => setLoading(false));
  }, [os]);

  useEffect(() => {
    setFiltered(
      keys.filter((key) => key.toLowerCase().includes(value.toLowerCase())),
    );
  }, [value, keys]);

  return (
    <div>
      <div className="relative w-full max-w-md mb-4">
        <Input
          type="text"
          placeholder="Filter keys..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="p-2 border rounded w-full inset-shadow-accent pr-10"
        />
        {keyword && (
          <button
            onClick={() => setKeyword("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-8 bg-gray-200 rounded animate-pulse"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-wrap gap-2">
          {filtered.map((key, index) => (
            <Badge
              variant="outline"
              key={index}
              className="font-mono break-all text-sm"
            >
              <Link href={`/os/find?key=${key}&os=${os}`}>{key}</Link>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
