"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OS } from "@/lib/types";
import { addBasePath } from "@/lib/env";
import { Skeleton } from "./ui/skeleton";
import { Checkbox } from "./ui/checkbox";

export default function OSList() {
  const [list, setList] = useState<OS[]>([]);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filtered, setFiltered] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(addBasePath("/api/os"));
      const data = await res.json();
      setList(data);
    }

    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFiltered(list.filter((os) => os.version.endsWith(".0")));
  }, [list]);

  return (
    <div>
      {loading && <Skeleton className="h-[20px] w-[100px] rounded-full" />}

      {!loading && list.length === 0 && (
        <div className="text-center">Failed to fetch OS list</div>
      )}

      <header className="mb-4">
        <Checkbox
          id="select-all"
          className="mr-2"
          checked={filterEnabled}
          onCheckedChange={(checked) => setFilterEnabled(!!checked)}
        />
        <label htmlFor="select-all" className="text-lg font-medium">
          Include Minor Versions
        </label>
      </header>

      <ul className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {(filterEnabled ? filtered : list).map((os, index) => (
          <li key={index} className="list-none">
            <Link
              href={`/os/${os.id}`}
              className="block p-4 border rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg">{os.version}</h2>
                <div className="text-sm text-gray-500">{os.build}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
