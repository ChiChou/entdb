"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import Link from "next/link";

import { addBasePath } from "@/lib/env";
import { Input } from "@/components/ui/input";
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
    <div className="text-left">
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
        <p>Loading</p>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((key, index) => (
            <li key={index} className="font-mono break-all text-sm">
              <Link
                href={`/os/find?key=${key}&os=${os}`}
                className="block p-4 border rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
              >
                {key}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
