"use client";

import { useEffect, useState } from "react";
import AllKeys from "@/components/all-keys";
import { useParams } from "next/navigation";

export default function SearchKey() {
  const [value, setValue] = useState("");
  const [binaries, setBinaries] = useState<string[]>([]);

  const { udid } = useParams();

  useEffect(() => {
    if (!value) return;
    fetch(`/api/os/${udid}/owns/${value}`)
      .then(res => res.text())
      .then(content => setBinaries(content.split('\n')));
  }, [udid, value]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Search by entitlement key</h2>
      <AllKeys setValue={setValue} value={value} />
      {value && (
        <div className="space-y-1">
          {binaries.map((binary) => (
            <pre key={binary} className="whitespace-pre-wrap break-words text-xs">{binary}</pre>
          ))}
        </div>
      )}
    </div>
  )
}