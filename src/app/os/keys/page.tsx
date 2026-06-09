"use client";

import {
  ChevronDown,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  GitCompare,
  History,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { HeaderPortal } from "@/components/header-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQueryFilter } from "@/hooks/use-query-filter";
import { createEngine } from "@/lib/engine";
import { getTopTokens, tokenizeKeys } from "@/lib/tokenizer";
import type { OS } from "@/lib/types";
import { cn } from "@/lib/utils";

function versionTag(os: OS) {
  return `${os.version}_${os.build}`;
}

function isCurrentVersion(os: OS, build: string) {
  return os.build === build || versionTag(os) === build;
}

function matchesVersion(os: OS, tag: string) {
  return os.build === tag || versionTag(os) === tag;
}

function compareOSVersion(a: OS, b: OS) {
  const vA = a.version.split(".").map(Number);
  const vB = b.version.split(".").map(Number);
  for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
    const diff = (vB[i] || 0) - (vA[i] || 0);
    if (diff !== 0) return diff;
  }

  return b.build.localeCompare(a.build);
}

const keySkeletons = Array.from(
  { length: 30 },
  (_, index) => `key-skeleton-${index}`,
);

type DisplayedKey = {
  key: string;
  os: string;
  status: "current" | "added" | "removed";
};

type VersionHistoryPanelProps = {
  activeCompareTag: string | null;
  build: string;
  className?: string;
  compareWith: string | null;
  group: string;
  groupedVersions: Array<[string, OS[]]>;
  listClassName?: string;
  setCompareWith: (value: string | null) => void;
  switchVersion: (version: OS) => void;
  versionsCount: number;
};

function KeyLink({ entry }: { entry: DisplayedKey }) {
  const isNew = entry.status === "added";
  const isRemoved = entry.status === "removed";

  return (
    <Link
      key={`${entry.status}:${entry.key}`}
      href={`/os/find?key=${encodeURIComponent(
        entry.key,
      )}&os=${encodeURIComponent(entry.os)}`}
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-md px-1 py-1 font-mono text-sm transition-colors",
        isNew
          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
          : isRemoved
            ? "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
      title={entry.key}
    >
      {(isNew || isRemoved) && (
        <span
          aria-label={isRemoved ? "Removed" : "New"}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            isRemoved
              ? "border-red-300/70 text-red-700 dark:border-red-700 dark:text-red-300"
              : "border-emerald-300/70 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
          )}
          title={isRemoved ? "Removed" : "New"}
        >
          {isRemoved ? (
            <Minus className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Plus className="h-3 w-3" aria-hidden="true" />
          )}
        </span>
      )}
      <span className="truncate">{entry.key}</span>
    </Link>
  );
}

function VersionHistoryPanel({
  activeCompareTag,
  build,
  className,
  compareWith,
  group,
  groupedVersions,
  listClassName,
  setCompareWith,
  switchVersion,
  versionsCount,
}: VersionHistoryPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-md border bg-muted/20 p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Version History
        </h2>
        <span className="text-xs text-muted-foreground">{versionsCount}</span>
      </div>

      <div className={cn("mt-3 space-y-1", listClassName)}>
        {groupedVersions.map(([major, groupVersions]) => (
          <details
            key={major}
            open={groupVersions.some(
              (version) =>
                isCurrentVersion(version, build) ||
                (activeCompareTag && matchesVersion(version, activeCompareTag)),
            )}
            className="group"
          >
            <summary className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
              <span className="flex-1">
                {group} {major}.x
              </span>
              <span className="inline-flex min-w-5 justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {groupVersions.length}
              </span>
            </summary>

            <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
              {groupVersions.map((version) => {
                const tag = versionTag(version);
                const isCurrent = isCurrentVersion(version, build);
                const isComparing = activeCompareTag
                  ? matchesVersion(version, activeCompareTag)
                  : false;

                return (
                  <div
                    key={tag}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isComparing
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "hover:bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => !isCurrent && switchVersion(version)}
                      disabled={isCurrent}
                      className={cn(
                        "min-w-0 flex-1 text-left",
                        isCurrent
                          ? "font-medium"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="block truncate font-mono">
                        {version.version}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs",
                          isCurrent
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground/70",
                        )}
                      >
                        {version.build}
                      </span>
                    </button>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() =>
                          setCompareWith(
                            isComparing && compareWith ? null : tag,
                          )
                        }
                        className={cn(
                          "rounded-md p-1 transition-colors",
                          isComparing
                            ? "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                        title={
                          isComparing
                            ? "Close diff"
                            : `Compare with ${version.version}`
                        }
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function Keys() {
  const params = useSearchParams();
  const router = useRouter();
  const os = params.get("os") as string;
  const [group, build] = os ? os.split("/") : ["", ""];

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<string[]>([]);
  const [versions, setVersions] = useState<OS[]>([]);
  const [compareKeys, setCompareKeys] = useState<string[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(false);
  const [changesExpanded, setChangesExpanded] = useState(false);
  const { keyword, setKeyword, debouncedKeyword } = useQueryFilter();

  const compareWith = params.get("diff");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!group || !build) {
        setKeys([]);
        setVersions([]);
        return;
      }

      const engine = await createEngine(group);
      const [allKeys, osList] = await Promise.all([
        engine.getKeys(build),
        engine.listOS().catch(() => [] as OS[]),
      ]);
      allKeys.sort((a, b) => a.localeCompare(b));
      osList.sort(compareOSVersion);

      if (!cancelled) {
        setKeys(allKeys);
        setVersions(osList);
      }
    }

    setLoading(true);
    load()
      .catch(() => {
        if (!cancelled) {
          setKeys([]);
          setVersions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [group, build]);

  const currentVersionIndex = useMemo(
    () => versions.findIndex((version) => isCurrentVersion(version, build)),
    [build, versions],
  );

  const currentVersion =
    currentVersionIndex === -1 ? undefined : versions[currentVersionIndex];

  const explicitCompareVersion = compareWith
    ? versions.find((version) => matchesVersion(version, compareWith))
    : undefined;

  const compareVersion = explicitCompareVersion;

  const compareTag = compareWith;
  const currentTag = currentVersion ? versionTag(currentVersion) : build;
  const activeCompareTag =
    compareTag &&
    compareTag !== build &&
    compareTag !== currentTag &&
    compareTag !== currentVersion?.build
      ? compareTag
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!group || !activeCompareTag) {
      setCompareKeys(null);
      setCompareLoading(false);
      setCompareError(false);
      setChangesExpanded(false);
      return;
    }

    async function loadCompareKeys() {
      const engine = await createEngine(group);
      const baseKeys = await engine.getKeys(activeCompareTag!);
      baseKeys.sort((a, b) => a.localeCompare(b));

      if (!cancelled) {
        setCompareKeys(baseKeys);
        setCompareError(false);
      }
    }

    setCompareKeys(null);
    setCompareLoading(true);
    setCompareError(false);
    loadCompareKeys()
      .catch(() => {
        if (!cancelled) {
          setCompareKeys([]);
          setCompareError(true);
          setChangesExpanded(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCompareLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [group, activeCompareTag]);

  const filtered = useMemo(
    () =>
      keys.filter((key) =>
        key.toLowerCase().includes(debouncedKeyword.toLowerCase()),
      ),
    [debouncedKeyword, keys],
  );

  const topTokens = useMemo(() => {
    if (keys.length === 0) return [];
    const freq = tokenizeKeys(keys);
    return getTopTokens(freq, 15, 10);
  }, [keys]);

  const diffReady =
    Boolean(activeCompareTag) &&
    compareKeys !== null &&
    !compareLoading &&
    !compareError;

  const compareKeySet = useMemo(
    () => new Set(compareKeys ?? []),
    [compareKeys],
  );

  const currentKeySet = useMemo(() => new Set(keys), [keys]);

  const addedKeys = useMemo(
    () => (diffReady ? keys.filter((key) => !compareKeySet.has(key)) : []),
    [compareKeySet, diffReady, keys],
  );

  const removedKeys = useMemo(
    () =>
      diffReady
        ? (compareKeys ?? []).filter((key) => !currentKeySet.has(key))
        : [],
    [compareKeys, currentKeySet, diffReady],
  );

  const addedKeySet = useMemo(() => new Set(addedKeys), [addedKeys]);

  const compareOs = activeCompareTag
    ? `${group}/${compareVersion ? versionTag(compareVersion) : activeCompareTag}`
    : os;

  const changedKeyCount = addedKeys.length + removedKeys.length;

  const changedKeys = useMemo<DisplayedKey[]>(() => {
    if (!diffReady) return [];

    const loweredKeyword = debouncedKeyword.toLowerCase();

    return [
      ...addedKeys.map((key) => ({ key, os, status: "added" as const })),
      ...removedKeys.map((key) => ({
        key,
        os: compareOs,
        status: "removed" as const,
      })),
    ]
      .filter((entry) => entry.key.toLowerCase().includes(loweredKeyword))
      .sort(
        (a, b) =>
          a.key.localeCompare(b.key) || a.status.localeCompare(b.status),
      );
  }, [addedKeys, compareOs, debouncedKeyword, diffReady, os, removedKeys]);

  const displayedKeys = useMemo<DisplayedKey[]>(
    () =>
      filtered.map((key) => ({
        key,
        os,
        status: diffReady && addedKeySet.has(key) ? "added" : "current",
      })),
    [addedKeySet, diffReady, filtered, os],
  );

  const isFiltering = debouncedKeyword.length > 0;

  const setCompareWith = (value: string | null) => {
    const newParams = new URLSearchParams(params.toString());
    if (value) {
      newParams.set("diff", value);
    } else {
      newParams.delete("diff");
    }
    router.replace(`/os/keys?${newParams.toString()}`, { scroll: false });
  };

  const switchVersion = (version: OS) => {
    const newParams = new URLSearchParams(params.toString());
    newParams.set("os", `${group}/${versionTag(version)}`);
    newParams.delete("diff");
    router.push(`/os/keys?${newParams.toString()}`);
  };

  const groupedVersions = useMemo(() => {
    const groups: Record<string, OS[]> = {};
    for (const version of versions) {
      const major = version.version.split(".")[0];
      groups[major] ??= [];
      groups[major].push(version);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a));
  }, [versions]);

  const filterControls = (
    <div className="relative flex-1 sm:flex-none sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Filter entitlement keys..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="pl-9 pr-9"
      />
      {keyword && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setKeyword("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <HeaderPortal>{filterControls}</HeaderPortal>

      {!loading && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-muted-foreground">
            {isFiltering ? (
              <>
                {filtered.length} of {keys.length} keys
              </>
            ) : (
              <>{keys.length} entitlement keys</>
            )}
          </span>
          {topTokens.length > 0 && !isFiltering && (
            <div className="flex flex-wrap gap-1">
              {topTokens.map(({ token }) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setKeyword(token)}
                  className="px-2 py-0.5 text-xs rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  {token}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="h-7 bg-muted/50 rounded"
              style={{ width: `${65 + (i * 17) % 30}%` }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {keys.length === 0 ? (
            <p>No entitlement keys found for this OS version.</p>
          ) : (
            <p>No keys match &quot;{keyword}&quot;</p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {filtered.map((key) => (
              <Link
                key={key}
                href={`/os/find?key=${encodeURIComponent(key)}&os=${os}`}
                className="block py-1 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                title={key}
              >
                {key}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
