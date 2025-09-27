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
      {loading ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
          </div>
          <div className="ml-6 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
            </div>
            <div className="ml-6 space-y-1">
              <div className="h-3 bg-gray-300 rounded w-20 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-28 animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
            </div>
            <div className="ml-6 space-y-1">
              <div className="h-3 bg-gray-300 rounded w-24 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-18 animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : (
        <FileSystem os={os} list={files} />
      )}
    </div>
  );
}
