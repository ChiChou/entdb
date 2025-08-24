"use client";

import FileSystem from "@/components/filesystem";

import { addBasePath } from "@/lib/env";
import { create } from "@/lib/kv";

import { redirect, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function FindByKey() {
  const params = useSearchParams();
  const os = params.get("os");
  const key = params.get("key");

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

      const reader = await create(addBasePath(`/data/${os}/keys`));

      const lines = await reader.get(key);
      setPaths(lines.split("\n").filter(Boolean));
    }
    fetchPaths();
  }, [os, key]);

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
      <FileSystem os={os} list={paths} />;
    </div>
  );
}
