"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { addBasePath } from "@/lib/env";
import { fetchLines } from "@/lib/client";

export default function Keys() {
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchLines(addBasePath(`/data/${params.id}/keys`))
      .then(setKeys)
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="mt-8 text-left">
      {loading ? (
        <p>Loading</p>
      ) : (
        <ul className="list-disc list-inside">
          {keys.map((key, index) => (
            <li key={index} className="font-mono break-all text-sm">
              {key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
