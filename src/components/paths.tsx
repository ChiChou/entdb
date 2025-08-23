"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { addBasePath } from "@/lib/env";
import { splitLines } from "@/lib/client";

export default function Keys() {
  const params = useParams();
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    fetch(addBasePath(`/data/${params.id}/paths`)).then((r) =>
      r.text().then(splitLines).then(setFiles),
    );
  });

  return (
    <div className="mt-8 text-left">
      {files.length === 0 ? (
        <p>Loading</p>
      ) : (
        <ul className="list-disc list-inside">
          {files.map((key, index) => (
            <li key={index} className="font-mono break-all">
              {key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
