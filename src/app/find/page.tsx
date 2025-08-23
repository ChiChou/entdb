"use client";

import { Breadcrumbs } from "@/components/breadcrumb-list";
import FileSystem from "@/components/filesystem";

import { fetchLines } from "@/lib/client";
import { addBasePath } from "@/lib/env";

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
      if (!os || !key) {
        setPaths([]);
        return;
      }
      fetchLines(addBasePath(`/data/${os}/search/${key}`)).then(setPaths);
    }
    fetchPaths();
  }, [os, key]);

  return (
    <div className="p-8">
      <header className="mb-4">
        <Breadcrumbs os={os}>
          <code className="text-red-800">{key}</code>
        </Breadcrumbs>
      </header>

      <FileSystem os={os} list={paths} />
    </div>
  );
}
