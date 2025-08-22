"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { addBasePath } from "@/lib/env";
import { splitLines } from "@/lib/client";

export default function Keys() {
  const params = useParams();
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    fetch(addBasePath(`/data/${params.id}/keys`)).then((r) =>
      r.text().then(splitLines).then(setKeys),
    );
  });

  return (
    <div className="mt-8 text-left">
      <h2 className="text-2xl font-semibold mb-4">Entitlement Keys</h2>
      {keys.length === 0 ? (
        <p>Loading keys...</p>
      ) : (
        <ul className="list-disc list-inside">
          {keys.map((key, index) => (
            <li key={index} className="font-mono break-all">
              {key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
