"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Group, OS } from "@/lib/types";
import { addBasePath } from "@/lib/env";
import { Skeleton } from "./ui/skeleton";
import { Checkbox } from "./ui/checkbox";

function responseOK(r: Response) {
  if (!r.ok) {
    throw new Error(`Failed to fetch resource at ${r.url}`);
  }
  return r;
}

function compareVersion(a: string, b: string) {
  const l1 = a.split(".").map(Number);
  const l2 = b.split(".").map(Number);
  const len = Math.max(l1.length, l2.length);

  for (let i = 0; i < len; i++) {
    const v1 = l1[i] || 0;
    const v2 = l2[i] || 0;
    if (v1 !== v2) return v2 - v1;
  }

  return 0;
}

export default function OSList() {
  const [showLess, setShowLess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());

  useEffect(() => {
    const set: Set<string> = new Set();
    for (const group of groups) {
      group.list.sort((a, b) => compareVersion(b.version, a.version));

      if (group.name === "osx") {
        // keep everything
        group.list.forEach((item) => set.add(item.build));
      } else {
        // keep only one for each major version
        const bucket: Map<string, OS[]> = new Map();
        group.list.forEach((item) => {
          const [major] = item.version.split(".", 1);
          const key = major.toString();
          if (!bucket.has(key)) {
            bucket.set(key, [item]);
          } else {
            bucket.get(key)!.push(item);
          }
        });
        bucket.values().forEach((items) => {
          items.sort((a, b) => compareVersion(b.version, a.version));
          const [first] = items;
          set.add(first?.build);
        });
      }
    }
    setHighlights(set);
  }, [groups]);

  useEffect(() => {
    setLoading(true);

    fetch(addBasePath("/data/groups.json"))
      .then(responseOK)
      .then((r) => r.json() as Promise<string[]>)
      .then(async (groupList: string[]) =>
        Promise.all(
          groupList.map(async (group) => {
            const response = await fetch(
              addBasePath(`/data/${group}/list.json`),
            ).then(responseOK);

            const data = await response.json();

            return {
              name: group,
              list: data,
            };
          }),
        ),
      )
      .then((groups) => {
        setGroups(groups);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && <Skeleton className="h-[20px] w-[100px] rounded-full" />}

      {!loading && groups.length === 0 && (
        <div className="text-center">Failed to fetch OS list</div>
      )}

      <header className="mb-4">
        <Checkbox
          id="select-all"
          className="mr-2"
          checked={showLess}
          onCheckedChange={(checked) => setShowLess(Boolean(checked))}
        />
        <label htmlFor="select-all" className="text-lg font-medium">
          Show Less
        </label>
      </header>

      {groups.map((group) => (
        <section key={group.name} className="my-6">
          <h2 className="text-2xl font-light my-4">{group.name}</h2>
          <ul className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {group.list
              .filter((os) => !showLess || highlights.has(os.build))
              .map((os, index) => (
                <li key={index} className="list-none">
                  <Link
                    href={`/os/keys?os=${group.name}/${os.version}_${os.build}`}
                    className="block p-4 border rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg">{os.name}</h2>
                      <div className="text-sm text-gray-500">{os.build}</div>
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
