"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Group } from "@/lib/types";
import { addBasePath } from "@/lib/env";
import { Skeleton } from "./ui/skeleton";
// import { Checkbox } from "./ui/checkbox";

function responseOK(r: Response) {
  if (!r.ok) {
    throw new Error(`Failed to fetch resource at ${r.url}`);
  }
  return r;
}

export default function OSList() {
  // const [includeMinorVersions, setIncludeMinorVersions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);

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

      {/*<header className="mb-4">
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
      </header>*/}

      {groups.map((group) => (
        <section key={group.name} className="my-6">
          <h2 className="text-2xl font-light my-4">{group.name}</h2>
          <ul className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {group.list.map((os, index) => (
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
