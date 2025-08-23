"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { addBasePath } from "@/lib/env";
import { fetchLines } from "@/lib/client";

import FileSystem from "./filesystem";

export default function Keys() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchLines(addBasePath(`/data/${params.id}/paths`))
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="mt-8 text-left">
      {loading ? (
        <p>Loading</p>
      ) : (
        <FileSystem os={params.id as string} list={files} />
      )}
    </div>
  );
}
