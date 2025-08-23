"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { fetchLines } from "@/lib/client";
import { addBasePath } from "@/lib/env";
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function FindByKey() {
  const params = useSearchParams();
  const os = params.get("os");
  const key = params.get("key");

  if (typeof os !== "string" || typeof key !== "string") {
    redirect("/404");
  }

  const [paths, setPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaths() {
      if (!os || !key) {
        setPaths([]);
        setError("Missing os or key parameter");
        return;
      }
      setError(null);
      fetchLines(`/data/${os}/search/${key}`)
        .then(setPaths)
        .catch(() => setError("Failed to fetch paths"));
    }
    fetchPaths();
  }, [os, key]);

  return (
    <div className="p-8">
      <header className="mb-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={addBasePath(`/os/${os}`)}>
                {os}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <code className="text-red-800">{key}</code>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {!os || !key ? (
        <p className="text-red-500">Missing os or key parameter</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : paths.length === 0 ? (
        <p>
          No paths found for key {key} in OS {os}
        </p>
      ) : (
        <ul className="list-disc list-inside">
          {paths.map((path, index) => (
            <li key={index} className="font-mono break-all">
              <Link
                href={addBasePath(
                  `/os/bin?os=${os}&path=${encodeURIComponent(path)}`,
                )}
                className="text-gray-600 hover:underline"
              >
                {path}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
