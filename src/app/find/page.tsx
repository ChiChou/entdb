"use client";

import { Breadcrumbs } from "@/components/breadcrumb-list";
import FileSystem from "@/components/filesystem";

import { fetchLines } from "@/lib/client";

import { redirect, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function FindByKey() {
  const params = useSearchParams();
  const os = params.get("os");
  const key = params.get("key");

  if (typeof os !== "string" || typeof key !== "string") {
    redirect("/404");
  }

  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaths() {
      if (!os || !key) {
        setPaths([]);
        setError("Missing os or key parameter");
        return;
      }
      setLoading(true);
      setError(null);
      fetchLines(`/data/${os}/search/${key}`)
        .then(setPaths)
        .catch(() => setError("Failed to fetch paths"))
        .finally(() => setLoading(false));
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

      {loading && <p>Loading...</p>}

      {!os || !key ? (
        <p className="text-red-500">Missing os or key parameter</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : !loading && paths.length === 0 ? (
        <p>
          No paths found for key {key} in OS {os}
        </p>
      ) : (
        <FileSystem os={os} list={paths} />
      )}
    </div>
  );
}
