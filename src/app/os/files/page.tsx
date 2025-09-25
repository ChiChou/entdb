"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { addBasePath } from "@/lib/env";
import { fetchLines } from "@/lib/client";

import FileSystem from "@/components/filesystem";

export default function Keys() {
  const params = useSearchParams();
  const os = params.get("os") as string;

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchLines(addBasePath(`/data/${os}/paths.txt`))
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [os]);

  return (
    <div className="text-left">
      {loading ? <p>Loading</p> : <FileSystem os={os} list={files} />}
    </div>
  );
}
