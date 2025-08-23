"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { fetchLines, fetchText } from "@/lib/client";
import { addBasePath } from "@/lib/env";
import { redirect, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BinaryDetail() {
  const params = useSearchParams();
  const os = params.get("os");
  const path = params.get("path");

  if (typeof os !== "string" || typeof path !== "string") {
    redirect("/404");
  }

  const [xml, setXML] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaths() {
      if (!os || !path) {
        setXML("");
        setError("Missing os or key parameter");
        return;
      }
      setError(null);
      fetchText(`/data/${os}/fs${path}.xml`)
        .then(setXML)
        .catch(() => setError("Failed to fetch xml"));
    }
    fetchPaths();
  }, [os, path]);

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
                <code className="text-red-800">{path}</code>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {xml}
    </div>
  );
}
