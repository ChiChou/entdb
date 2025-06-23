"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AllKeys from "@/components/all-keys";
import { CopyButton } from "./copy-button";

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
      <AllKeys setValue={setValue} value={value} />
      {value && (
        <ul className="space-y-1">
          {binaries.map((binary) => (
            <li key={binary}>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right overflow-hidden relative h-4">
                  <pre className="text-xs text-red-900 absolute right-0 top-0">
                    <Link href={`/os/${udid}/bin?path=${binary}`}>
                      {binary}
                    </Link></pre>
                </div>
                <nav className="ml-auto">
                  <CopyButton text={binary} />
                </nav>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}