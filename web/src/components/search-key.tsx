"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { useParams, useSearchParams } from "next/navigation";

import { CopyButton } from "./copy-button";
import { AutoComplete } from "./auto-complete";

export default function SearchKey() {
  const [searchValue, setSearchValue] = useState<string>("");
  const [value, setValue] = useState("");
  const [binaries, setBinaries] = useState<string[]>([]);
  const [data, setData] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);

  const [debouncedSearchValue] = useDebounce(searchValue, 300);

  const { udid } = useParams();
  const keyFromSearchQuery = useSearchParams().get('key');

  useEffect(() => {
    if (!value) return;
    fetch(`/api/os/${udid}/owns/${value}`)
      .then((res) => res.text())
      .then((content) => setBinaries(content.split("\n")));
  }, [udid, value]);

  useEffect(() => {
    if (!value) return;
    const url = new URL(window.location.href);
    url.searchParams.set('key', value);
    window.history.replaceState({}, '', url.toString());
  }, [value]);

  useEffect(() => {
    if (keyFromSearchQuery) {
      setValue(keyFromSearchQuery);
      setSearchValue(keyFromSearchQuery);
    } else {
      setAutoFocus(true);
    }
  }, [keyFromSearchQuery, setValue]);

  useEffect(() => {
    async function fetchKey() {
      if (!debouncedSearchValue.trim()) {
        setData([]);
        return;
      }

      setLoading(true);
      const txt = await fetch(
        `/api/os/${udid}/keys?k=${encodeURIComponent(debouncedSearchValue)}`,
      ).then((r) => r.text());
      setLoading(false);

      const items = txt
        .split("\n")
        .filter((k) => k.trim())
        .map((k) => ({ value: k, label: k }));

      setData(items);
    }

    fetchKey();
  }, [debouncedSearchValue, udid]);

  return (
    <div className="space-y-4">
      <AutoComplete
        selectedValue={value}
        onSelectedValueChange={setValue}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        items={data ?? []}
        focus={autoFocus}
        isLoading={loading}
      />

      {loading && (
        <div className="text-gray-500 text-sm">Loading...</div>
      )}

      {value && (
        <ul className="space-y-1">
          {binaries.map((binary) => (
            <li key={binary}>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right overflow-hidden relative h-4">
                  <pre className="text-xs text-red-900 absolute right-0 top-0">
                    <Link href={`/os/${udid}/bin?path=${binary}`}>
                      {binary}
                    </Link>
                  </pre>
                </div>
                <nav className="ml-auto">
                  <CopyButton text={binary} />
                </nav>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
