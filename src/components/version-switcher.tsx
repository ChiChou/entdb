"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Check } from "lucide-react";

import type { OS } from "@/lib/types";
import { addBasePath } from "@/lib/env";

function compareVersion(a: string, b: string) {
  const l1 = a.split(".").map(Number);
  const l2 = b.split(".").map(Number);
  const len = Math.max(l1.length, l2.length);

  for (let i = 0; i < len; i++) {
    const v1 = l1[i] || 0;
    const v2 = l2[i] || 0;
    if (v1 !== v2) return v2 - v1;
  }

  return 0;
}

export function VersionSwitcher({ currentOs }: { currentOs: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [group, currentBuild] = currentOs ? currentOs.split("/") : ["", ""];
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<OS[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!group) return;

    fetch(addBasePath(`/data/${group}/list.json`))
      .then((r) => r.json())
      .then((list: OS[]) => {
        list.sort((a, b) => compareVersion(a.version, b.version));
        setVersions(list);
      })
      .finally(() => setLoading(false));
  }, [group]);

  const currentVersion = versions.find(
    (v) => v.build === currentBuild || `${v.version}_${v.build}` === currentBuild
  );

  const filteredVersions = versions.filter((v) =>
    `${v.version} ${v.build} ${v.name}`.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSelect = (os: OS) => {
    const newTag = `${os.version}_${os.build}`;
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("os", `${group}/${newTag}`);

    router.push(`${pathname}?${newParams.toString()}`);
    setOpen(false);
    setFilter("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px] font-mono"
        >
          {loading ? (
            "Loading..."
          ) : currentVersion ? (
            <span>
              {currentVersion.version}{" "}
              <span className="text-muted-foreground text-xs">
                ({currentVersion.build})
              </span>
            </span>
          ) : (
            currentBuild
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Filter versions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredVersions.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No versions found
            </div>
          )}
          {filteredVersions.map((os) => {
            const isSelected =
              os.build === currentBuild ||
              `${os.version}_${os.build}` === currentBuild;

            return (
              <button
                key={os.build}
                onClick={() => handleSelect(os)}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer ${
                  isSelected ? "bg-accent" : ""
                }`}
              >
                <span className="font-mono">
                  {os.version}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({os.build})
                  </span>
                </span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
