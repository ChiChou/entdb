"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Group, OS } from "@/lib/types";
import { dataURL } from "@/lib/env";
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
  const searchParams = useSearchParams();
  const showAll = searchParams.get("view") === "all";

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

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
        const isIOSOrMac = group.name === "iOS" || group.name === "mac";
        let latestTwoMajors = new Set<string>();
        if (isIOSOrMac) {
          const sortedMajors = Array.from(bucket.keys())
            .map(Number)
            .sort((a, b) => b - a)
            .slice(0, 2)
            .map(String);
          latestTwoMajors = new Set(sortedMajors);
        }

        bucket.forEach((items, major) => {
          items.sort((a, b) => compareVersion(b.version, a.version));

          if (isIOSOrMac && latestTwoMajors.has(major)) {
            items.forEach((item) => set.add(item.build));
          } else {
            const [first] = items;
            set.add(first?.build);
          }
        });
      }
    }
    setHighlights(set);
  }, [groups]);

  useEffect(() => {
    setLoading(true);

    fetch(`${dataURL}/groups.json`)
      .then(responseOK)
      .then((r) => r.json() as Promise<string[]>)
      .then(async (groupList: string[]) =>
        Promise.all(
          groupList.map(async (group) => {
            const response = await fetch(
              `${dataURL}/${group}/list.json`,
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
        // Enable all platforms by default
        setSelectedPlatforms(new Set(groups.map((g) => g.name)));
      })
      .finally(() => setLoading(false));
  }, []);

  const togglePlatform = (name: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        // Don't allow deselecting all
        if (next.size > 1) next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => selectedPlatforms.has(g.name));
  }, [groups, selectedPlatforms]);

  return (
    <div>
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((group) => (
            <section key={group} className="my-4">
              <Skeleton className="h-6 w-24 mb-3" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton key={item} className="h-14" />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Failed to fetch OS list
        </div>
      )}

      {!loading && groups.length > 0 && (
        <>
          {/* Platform filters */}
          <div className="flex items-center gap-1 mb-6">
            {groups.map((group) => (
              <button
                key={group.name}
                onClick={() => togglePlatform(group.name)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  selectedPlatforms.has(group.name)
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>

          {filteredGroups.map((group) => {
            const majorGroups = groupByMajor(group.list);

            return (
              <section key={group.name} id={group.name} className="mb-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  {group.name}
                  <span className="flex-1 border-t border-border" />
                </h2>

                {!showAll ? (
                  <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {group.list
                      .filter((os) => highlights.has(os.build))
                      .map((os, index) => (
                        <li key={index} className="list-none">
                          <Link
                            href={`/os/keys?os=${group.name}/${os.version}_${os.build}`}
                            className="block p-3 border border-border rounded-lg hover:border-foreground/20 transition-colors hover:bg-accent/50"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{os.version}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {os.build}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="space-y-4">
                    {majorGroups.map((majorGroup) => (
                      <div key={majorGroup.major}>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          {group.name} {majorGroup.major}
                        </h3>
                        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {majorGroup.versions.map((os, index) => (
                            <li key={index} className="list-none">
                              <Link
                                href={`/os/keys?os=${group.name}/${os.version}_${os.build}`}
                                className="block p-3 border border-border rounded-lg hover:border-foreground/20 transition-colors hover:bg-accent/50"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{os.version}</span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {os.build}
                                  </span>
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
        </>
      )}
    </div>
  );
}
