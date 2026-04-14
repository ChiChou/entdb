"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

import { Group, OS } from "@/lib/types";
import { addBasePath } from "@/lib/env";
import { Skeleton } from "./ui/skeleton";

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
    if (v1 !== v2) return v1 - v2;
  }

  return 0;
}

interface MajorGroup {
  major: string;
  versions: OS[];
}

function groupByMajor(list: OS[]): MajorGroup[] {
  const bucket = new Map<string, OS[]>();

  for (const os of list) {
    const major = os.version.split(".")[0];
    if (!bucket.has(major)) {
      bucket.set(major, []);
    }
    bucket.get(major)!.push(os);
  }

  return Array.from(bucket.entries())
    .map(([major, versions]) => {
      versions.sort((a, b) => compareVersion(b.version, a.version));
      return { major, versions };
    })
    .sort((a, b) => Number(b.major) - Number(a.major));
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
        group.list.forEach((item) => set.add(item.build));
      } else {
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
      {loading && (
        <div className="space-y-6">
          <div className="mb-4 flex items-center">
            <Skeleton className="h-4 w-4 mr-2" />
            <Skeleton className="h-6 w-24" />
          </div>

          {[1, 2, 3].map((group) => (
            <section key={group} className="my-6">
              <Skeleton className="h-8 w-32 my-4" />
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <div key={item} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center">Failed to fetch OS list</div>
      )}

      {!loading && (
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
            <button
              onClick={() => setShowLess(true)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                showLess
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Major Releases
            </button>
            <button
              onClick={() => setShowLess(false)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                !showLess
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Builds
            </button>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            {groups.map((group) => (
              <a
                key={group.name}
                href={`#${group.name}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {group.name}
              </a>
            ))}
          </nav>
        </header>
      )}

      {groups.map((group) => {
        const majorGroups = groupByMajor(group.list);

        return (
          <section key={group.name} id={group.name} className="my-6 scroll-mt-20">
            <h2 className="text-2xl font-light my-4">{group.name}</h2>

            {showLess ? (
              <ul className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {group.list
                  .filter((os) => highlights.has(os.build))
                  .map((os, index) => (
                    <li key={index} className="list-none">
                      <Link
                        href={`/os/keys?os=${group.name}/${os.version}_${os.build}`}
                        className="block p-4 border border-border rounded-lg hover:border-foreground/20 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg">{os.name}</h2>
                          <div className="text-sm text-muted-foreground">
                            {os.build}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="space-y-6">
                {majorGroups.map((majorGroup) => (
                  <div key={majorGroup.major}>
                    <h3 className="text-lg font-medium text-muted-foreground mb-3">
                      {group.name === "iOS" ? "iOS" : group.name === "mac" ? "macOS" : "OS X"} {majorGroup.major}
                    </h3>
                    <ul className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      {majorGroup.versions.map((os, index) => (
                        <li key={index} className="list-none">
                          <Link
                            href={`/os/keys?os=${group.name}/${os.version}_${os.build}`}
                            className="block p-4 border border-border rounded-lg hover:border-foreground/20 transition-colors hover:bg-accent/50"
                          >
                            <div className="flex justify-between items-center">
                              <h2 className="text-lg">{os.name}</h2>
                              <div className="text-sm text-muted-foreground">
                                {os.build}
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
