"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import FileSystem from "@/components/filesystem";
import { createEngine } from "@/lib/engine";

export default function Files() {
  const params = useSearchParams();
  const os = params.get("os") as string;
  const [group, build] = os ? os.split("/") : ["", ""];

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    createEngine(group)
      .then((engine) => engine.getPaths(build))
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [group, build]);

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
