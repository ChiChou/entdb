"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OS } from "@/lib/types";
import { addBasePath } from "@/lib/env";
import { Skeleton } from "./ui/skeleton";
import { Checkbox } from "./ui/checkbox";

export default function OSList() {
  const [list, setList] = useState<OS[]>([]);
  const [includeMinorVersions, setIncludeMinorVersions] = useState(true);
  const [filtered, setFiltered] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(addBasePath("/data/list"))
      .then((r) => {
        if (!r.ok) {
          throw new Error("Failed to fetch OS list");
        }
        return r;
      })
      .then((r) => r.text())
      .then((txt) => {
        const lines = txt.split("\n").filter((line) => line.trim() !== "");
        return lines.map((id) => {
          const [version, build] = id.split("_");
          return { id, version, build };
        });
      })
      .then(setList)
      .finally(() => setLoading(false));
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
          checked={includeMinorVersions}
          onCheckedChange={(checked) =>
            setIncludeMinorVersions(Boolean(checked))
          }
        />
        <label htmlFor="select-all" className="text-lg font-medium">
          Include Minor Versions
        </label>
      </header>

      <ul className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {(includeMinorVersions ? list : filtered).map((os, index) => (
          <li key={index} className="list-none">
            <Link
              href={`/os?os=${os.id}`}
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
