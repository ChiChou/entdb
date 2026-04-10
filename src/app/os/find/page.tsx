"use client";

import FileSystem from "@/components/filesystem";

import { createEngine } from "@/lib/engine";

import { redirect, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function FindByKey() {
  const params = useSearchParams();
  const os = params.get("os");
  const key = params.get("key");

  const [group, build] = os ? os.split("/") : ["", ""];

  useEffect(() => {
    if (os && key) {
      document.title = `Find "${key}" in ${os} - Entitlement Database`;
    }
  });

  if (typeof os !== "string" || typeof key !== "string") {
    redirect("/404");
  }

  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPaths() {
      if (!key) return;

      const engine = await createEngine(group);
      const result = await engine.getPathsForKey(build, key);
      setPaths(result);
    }
    fetchPaths();
  }, [group, build, key]);

  return (
    <div>
      <header>
        <h1 className="text-gray-800">
          Binaries that have the following entitlement:
        </h1>
        <p>
          <code className="text-sm break-all text-red-700">{key}</code>
        </p>
      </header>
      <FileSystem os={os} list={paths} />
    </div>
  );
}
