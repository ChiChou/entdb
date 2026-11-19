"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleMinus,
  CirclePlus,
  Copy,
  GitCompare,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BetaBadge } from "@/components/beta-badge";
import FileSystem, { type PathStatus } from "@/components/filesystem";
import { HeaderPortal } from "@/components/header-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryFilter } from "@/hooks/use-query-filter";
import { createEngine } from "@/lib/engine";
import {
  KEY_TRANSITION_NAME,
  type KeysReturn,
  keysPageFor,
  requestScrollRestore,
} from "@/lib/key-navigation";
import { compareOSVersion, matchesVersion, versionTag } from "@/lib/os-version";
import type { OS } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTER_INPUT_ID = "path-filter";

/**
 * Placeholder tree (depth, isFolder) shaped like FileSystem: a couple of
 * top-level folders open with files and a nested folder.
 */
const TREE_SKELETON: [number, boolean][] = [
  [0, true],
  [1, false],
  [1, false],
  [1, false],
  [1, false],
  [0, true],
  [1, true],
  [2, false],
  [2, false],
  [1, true],
  [1, false],
  [0, true],
  [1, false],
  [1, false],
];

function keysUrlFor(os: string, ns: string) {
  const query = new URLSearchParams({ os });
  if (ns) query.set("ns", ns);
  return `/os/keys?${query.toString()}`;
}

/** Paths for a key in a build; a key absent from the build has none. */
async function pathsForKey(group: string, build: string, key: string) {
  const engine = await createEngine(group);
  try {
    return await engine.getPathsForKey(build, key);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("key not found"))
      return [];
    throw error;
  }
}

export default function FindByKey() {
  const params = useSearchParams();
  const router = useRouter();
  const os = params.get("os");
  const key = params.get("key");

  const [group, build] = os ? os.split("/") : ["", ""];
  const compareWith = params.get("diff");

  useEffect(() => {
    if (os && key) {
      document.title = `Find "${key}" in ${os} - Entitlement Database`;
    }
  });

  if (typeof os !== "string" || typeof key !== "string") {
    redirect("/404");
  }

  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<string[]>([]);
  const [versions, setVersions] = useState<OS[]>([]);
  const [comparePaths, setComparePaths] = useState<string[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(false);
  const [changesOnly, setChangesOnlyState] = useState(
    () => params.get("changes") === "1",
  );
  const [copied, setCopied] = useState(false);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const { keyword, setKeyword, debouncedKeyword } = useQueryFilter();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      pathsForKey(group, build, key),
      createEngine(group).then((engine) =>
        engine.listOS().catch(() => [] as OS[]),
      ),
    ])
      .then(([result, list]) => {
        if (cancelled) return;
        setPaths(result);
        setVersions([...list].sort(compareOSVersion));
      })
      .catch(() => {
        if (!cancelled) setPaths([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [group, build, key]);

  const currentVersion = versions.find((v) => matchesVersion(v, build));
  const compareVersion = compareWith
    ? versions.find((v) => matchesVersion(v, compareWith))
    : undefined;
  const activeCompare =
    compareVersion && compareVersion !== currentVersion ? compareVersion : null;

  useEffect(() => {
    let cancelled = false;
    if (!activeCompare) {
      setComparePaths(null);
      setCompareLoading(false);
      setCompareError(false);
      return;
    }
    setComparePaths(null);
    setCompareLoading(true);
    setCompareError(false);
    pathsForKey(group, versionTag(activeCompare), key)
      .then((result) => {
        if (!cancelled) setComparePaths(result);
      })
      .catch(() => {
        if (!cancelled) setCompareError(true);
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [group, key, activeCompare]);

  const diffReady = Boolean(activeCompare) && comparePaths !== null;

  const { added, removed } = useMemo(() => {
    if (!diffReady || !comparePaths) return { added: [], removed: [] };
    const current = new Set(paths);
    const base = new Set(comparePaths);
    return {
      added: paths.filter((path) => !base.has(path)),
      removed: comparePaths.filter((path) => !current.has(path)),
    };
  }, [comparePaths, diffReady, paths]);

  const showChanges = changesOnly && diffReady;

  // Lost binaries stay in the tree (marked) so changes show in place.
  const { list, statusOf } = useMemo(() => {
    const addedSet = new Set(added);
    const removedSet = new Set(removed);
    const all = showChanges ? [...added, ...removed] : [...paths, ...removed];
    const kw = debouncedKeyword.toLowerCase();
    return {
      list: kw ? all.filter((path) => path.toLowerCase().includes(kw)) : all,
      statusOf: (path: string): PathStatus | undefined =>
        addedSet.has(path)
          ? "added"
          : removedSet.has(path)
            ? "removed"
            : undefined,
    };
  }, [added, debouncedKeyword, paths, removed, showChanges]);

  const setParam = (name: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`/os/find?${next.toString()}`, { scroll: false });
  };

  const setChangesOnly = (value: boolean) => {
    setChangesOnlyState(value);
    const next = new URLSearchParams(window.location.search);
    if (value) next.set("changes", "1");
    else next.delete("changes");
    window.history.replaceState(null, "", `?${next.toString()}`);
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  // "/" focuses the filter from anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      )
        return;
      const input = document.getElementById(FILTER_INPUT_ID);
      if (!input) return;
      event.preventDefault();
      (input as HTMLInputElement).select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isFiltering = debouncedKeyword.length > 0;
  // Narrowed views (filter, changes only) open every folder; otherwise the
  // tree starts with top-level folders open, as before.
  const narrowed = isFiltering || showChanges;
  useEffect(() => {
    setExpandAll(narrowed ? true : null);
  }, [narrowed]);

  const [keysReturn, setKeysReturn] = useState<KeysReturn | null>(null);
  // sessionStorage is client-only; read it after hydration.
  useEffect(() => setKeysReturn(keysPageFor(key, os)), [key, os]);

  const namespace = key.includes(".") ? key.slice(0, key.lastIndexOf(".")) : "";
  const backUrl = keysReturn?.url ?? keysUrlFor(os, namespace);
  const backNs = keysReturn
    ? (new URLSearchParams(keysReturn.url.split("?")[1] ?? "").get("ns") ?? "")
    : namespace;
  const compareOs = activeCompare
    ? `${group}/${versionTag(activeCompare)}`
    : os;

  /** Keys page at namespace `ns`, keeping an active comparison. */
  const keysUrl = (ns: string) => {
    const query = new URLSearchParams({ os });
    if (ns) query.set("ns", ns);
    if (activeCompare) query.set("diff", versionTag(activeCompare));
    return `/os/keys?${query.toString()}`;
  };

  // All keys › [namespace the user came from] › the key's namespace.
  const crumbs: { ns: string; label: string }[] = [
    { ns: "", label: "All keys" },
  ];
  if (backNs && backNs !== namespace)
    crumbs.push({ ns: backNs, label: backNs });
  if (namespace)
    crumbs.push({
      ns: namespace,
      label:
        backNs && namespace.startsWith(`${backNs}.`)
          ? namespace.slice(backNs.length + 1)
          : namespace,
    });

  const returnToKeys = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!keysReturn) return;
    requestScrollRestore(keysReturn);
    // Same tab, straight from the keys page: go back in history.
    if (
      window.history.length > 1 &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      router.back();
    }
  };

  const filterControls = (
    <>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={FILTER_INPUT_ID}
          type="text"
          placeholder="Filter binaries..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 pr-9"
        />
        {!keyword && (
          <kbd
            className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:block"
            title="Press / to filter"
          >
            /
          </kbd>
        )}
        {keyword && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setKeyword("")}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!loading && list.length > 0 && (
        <div className="flex shrink-0 items-center rounded-md border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandAll(true)}
            className="h-8 rounded-r-none px-2"
            title="Expand all"
            aria-label="Expand all"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandAll(false)}
            className="h-8 rounded-l-none px-2"
            title="Collapse all"
            aria-label="Collapse all"
          >
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );

  // Versions grouped by major for the compare picker.
  const versionGroups = useMemo(() => {
    const groups = new Map<string, OS[]>();
    for (const version of versions) {
      if (version === currentVersion) continue;
      const major = version.version.split(".")[0];
      const list = groups.get(major);
      if (list) list.push(version);
      else groups.set(major, [version]);
    }
    return [...groups];
  }, [currentVersion, versions]);

  return (
    <div className="flex h-full flex-col">
      <HeaderPortal>{filterControls}</HeaderPortal>

      {/* Where this key lives, styled like the keys page's own path. The
          arrow, and the crumb the user came from, return to exactly where
          they were (namespace, filter, comparison, scroll). */}
      <nav
        aria-label="Breadcrumb"
        className="mb-1.5 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-sm"
      >
        <Link
          href={backUrl}
          onClick={returnToKeys}
          aria-label="Back to keys"
          title="Back to keys"
          className="mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        {crumbs.map((crumb, i) => (
          <span key={crumb.ns || "(all)"} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <Link
              href={crumb.ns === backNs ? backUrl : keysUrl(crumb.ns)}
              onClick={crumb.ns === backNs ? returnToKeys : undefined}
              title={crumb.ns || "All keys"}
              className={cn(
                "rounded px-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                crumb.ns && "font-mono",
              )}
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Key context: what we're looking at, and where it lives. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-1">
          <code
            data-key-title
            // The clicked key on the keys page morphs into this title.
            style={{ viewTransitionName: KEY_TRANSITION_NAME }}
            className="break-all font-mono text-base font-semibold"
          >
            {key}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(key)
                .then(() => setCopied(true))
                .catch(() => {});
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={copied ? "Copied" : "Copy key"}
            title={copied ? "Copied" : "Copy key"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm">
          {!loading && (
            <span className="tabular-nums text-muted-foreground">
              {isFiltering ? `${list.length} of ${paths.length}` : paths.length}{" "}
              {paths.length === 1 ? "binary" : "binaries"}
              {currentVersion && (
                <>
                  {" "}
                  in {currentVersion.version}
                  {currentVersion.beta && (
                    <span className="ml-1 align-middle">
                      <BetaBadge />
                    </span>
                  )}
                </>
              )}
            </span>
          )}

          {compareLoading && (
            <span className="text-muted-foreground">Comparing…</span>
          )}
          {compareError && (
            <span className="text-destructive">Compare unavailable</span>
          )}

          {diffReady && (
            <>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CirclePlus className="h-3.5 w-3.5" />
                {added.length} gained
              </span>
              <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
                <CircleMinus className="h-3.5 w-3.5" />
                {removed.length} lost
              </span>
              {added.length + removed.length > 0 && (
                <Button
                  type="button"
                  variant={changesOnly ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setChangesOnly(!changesOnly)}
                  className="h-7 gap-1.5 px-2 text-xs"
                  aria-pressed={changesOnly}
                  title="Show only binaries that gained or lost this key"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  Changed only
                </Button>
              )}
            </>
          )}

          {versions.length > 1 && (
            <label className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs text-muted-foreground has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring">
              <GitCompare className="h-3.5 w-3.5" />
              <span className="sr-only">Compare with</span>
              <select
                value={activeCompare ? versionTag(activeCompare) : ""}
                onChange={(e) => setParam("diff", e.target.value || null)}
                className="bg-transparent text-foreground outline-none"
              >
                <option value="">Compare with…</option>
                {versionGroups.map(([major, list]) => (
                  <optgroup key={major} label={`${group} ${major}`}>
                    {list.map((version) => (
                      <option
                        key={versionTag(version)}
                        value={versionTag(version)}
                      >
                        {version.version} ({version.build})
                        {version.beta ? " beta" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {activeCompare && (
                <button
                  type="button"
                  onClick={() => setParam("diff", null)}
                  className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                  aria-label="Stop comparing"
                  title="Stop comparing"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          )}
        </div>
      </div>

      {loading ? (
        <div
          aria-busy="true"
          aria-label="Loading binaries"
          className="space-y-0.5"
        >
          {TREE_SKELETON.map(([depth, folder], i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
              key={i}
              className="flex h-7 items-center gap-2 px-1"
              style={{ paddingLeft: `${depth * 1.5 + 0.25}rem` }}
            >
              {folder && (
                <Skeleton className="h-3.5 w-3.5 rounded-sm opacity-60" />
              )}
              <Skeleton className="h-4 w-4 rounded-sm opacity-60" />
              <Skeleton
                className="h-4"
                style={{ width: `${(folder ? 7 : 12) + ((i * 7) % 12)}rem` }}
              />
              {folder && <Skeleton className="h-3 w-5 opacity-60" />}
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {paths.length === 0 && !diffReady ? (
            <p>No binaries found with this entitlement.</p>
          ) : showChanges && !isFiltering ? (
            <p>No binaries gained or lost this key.</p>
          ) : (
            <p>No binaries match &quot;{keyword}&quot;</p>
          )}
        </div>
      ) : (
        <FileSystem
          os={os}
          list={list}
          expandAll={expandAll}
          status={diffReady ? statusOf : undefined}
          osFor={(path) =>
            statusOf(path) === "removed" ? compareOs : undefined
          }
        />
      )}
    </div>
  );
}
