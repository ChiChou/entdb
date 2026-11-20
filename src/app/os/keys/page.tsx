"use client";

import {
  ChevronRight,
  CircleMinus,
  CirclePlus,
  GitCompare,
  History,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BetaBadge } from "@/components/beta-badge";
import { HeaderPortal } from "@/components/header-portal";
import type { DisplayedKey } from "@/components/key-link";
import { KeyList } from "@/components/key-list";
import { NamespaceTree } from "@/components/key-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryFilter } from "@/hooks/use-query-filter";
import { createEngine } from "@/lib/engine";
import { basePath } from "@/lib/env";
import { takeScrollRestore } from "@/lib/key-navigation";
import {
  type NamespaceNode,
  allNamespaces,
  buildNamespaceTree,
  findNamespace,
  inNamespace,
  namespacePath,
} from "@/lib/key-tree";
import { compareOSVersion, matchesVersion, versionTag } from "@/lib/os-version";
import type { OS } from "@/lib/types";
import { cn } from "@/lib/utils";

function isCurrentVersion(os: OS, build: string) {
  return matchesVersion(os, build);
}

function withoutBasePath(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length)
    : path;
}

/** Open every namespace when a filtered result is this small. */
const AUTO_EXPAND_LIMIT = 300;

/**
 * Namespaces open by default: the "dominant" chain (a namespace holding most
 * of its parent's keys, such as `com.apple`) and the path to the selection.
 */
function defaultOpenNamespaces(
  tree: NamespaceNode,
  selected: string,
  filtering: boolean,
) {
  if (filtering && tree.count <= AUTO_EXPAND_LIMIT) {
    return new Set(allNamespaces(tree));
  }
  const open = new Set(namespacePath(tree, selected).map((node) => node.ns));
  let node: NamespaceNode | undefined = tree;
  while (node) {
    const parentCount: number = node.count;
    node = node.children.find((child) => child.count > parentCount / 2);
    if (node) open.add(node.ns);
  }
  return open;
}

const FILTER_INPUT_ID = "key-filter";

/**
 * Page grid. Phone: toolbar / tree / list stacked. md+: tree column beside
 * the toolbar and list. 2xl+: version history returns as a third column so
 * switching or comparing stays one click away. Shared with the skeleton so
 * nothing moves when the data arrives.
 */
function keysLayoutClass(withVersions: boolean) {
  return cn(
    "grid gap-x-6 gap-y-3 [grid-template-areas:'toolbar'_'nav'_'list']",
    "md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:[grid-template-areas:'nav_toolbar'_'nav_list']",
    "2xl:grid-cols-[18rem_minmax(0,1fr)]",
    withVersions &&
      "2xl:grid-cols-[18rem_minmax(0,1fr)_17rem] 2xl:[grid-template-areas:'nav_toolbar_aside'_'nav_list_aside']",
  );
}

/** Tree depth per skeleton row: a few top-level namespaces, one opened. */
const TREE_SKELETON = [0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2];
const LIST_SKELETON = Array.from({ length: 48 }, (_, i) => i);

function KeysSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading keys"
      className={keysLayoutClass(true)}
    >
      <div className="flex items-center gap-2 [grid-area:toolbar]">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="ml-auto h-7 w-24 2xl:hidden" />
      </div>

      <div className="overflow-hidden rounded-md border p-1 [grid-area:nav] max-md:h-56 md:self-start">
        {TREE_SKELETON.map((depth, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
            key={i}
            className="flex h-7 items-center gap-2 pr-2"
            style={{ paddingLeft: `${depth * 0.875 + 0.5}rem` }}
          >
            <Skeleton className="h-3 w-3 rounded-sm opacity-60" />
            <Skeleton
              className="h-3.5"
              style={{ width: `${40 + ((i * 37) % 45)}%` }}
            />
            <Skeleton className="ml-auto h-3 w-6 opacity-60" />
          </div>
        ))}
      </div>

      {/* Same column flow as KeyList: 1 column, 2 from xl, 3 on very wide. */}
      <div className="columns-1 gap-x-4 [grid-area:list] xl:columns-2 min-[2200px]:columns-3">
        {LIST_SKELETON.map((i) => (
          <div key={i} className="mb-1 break-inside-avoid py-1.5">
            <Skeleton
              className="h-4"
              style={{ width: `${45 + ((i * 29) % 45)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="hidden space-y-2 rounded-md border p-3 [grid-area:aside] 2xl:block 2xl:self-start">
        <Skeleton className="mb-3 h-4 w-28" />
        {LIST_SKELETON.slice(0, 12).map((i) => (
          <Skeleton key={i} className={cn("h-7", i < 4 && "ml-4")} />
        ))}
      </div>
    </div>
  );
}

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
                      // A tint plus a mark on the guide line, not a solid block.
                      isCurrent
                        ? "relative bg-primary/10 text-primary font-medium before:absolute before:inset-y-1 before:-left-[13.5px] before:w-0.5 before:rounded-full before:bg-primary"
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
                      <span className="flex items-center gap-1.5 truncate font-mono">
                        {version.version}
                        {version.beta && <BetaBadge />}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs",
                          isCurrent
                            ? "text-primary/70"
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
      ...addedKeys.map((key) => ({
        key,
        os,
        status: "added" as const,
        diff: activeCompareTag ?? undefined,
      })),
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
  }, [
    activeCompareTag,
    addedKeys,
    compareOs,
    debouncedKeyword,
    diffReady,
    os,
    removedKeys,
  ]);

  const displayedKeys = useMemo<DisplayedKey[]>(
    () =>
      filtered.map((key) => ({
        key,
        os,
        status: diffReady && addedKeySet.has(key) ? "added" : "current",
        // Open the find page comparing against the same version.
        diff: diffReady ? (activeCompareTag ?? undefined) : undefined,
      })),
    [activeCompareTag, addedKeySet, diffReady, filtered, os],
  );

  const isFiltering = debouncedKeyword.length > 0;

  // "Changed only" narrows the tree and list to added + removed keys. Kept in
  // `?changes=1` (via replaceState, like `?ns=`) so the view can be shared.
  const [changesOnly, setChangesOnlyState] = useState(
    () => params.get("changes") === "1",
  );
  const setChangesOnly = (value: boolean) => {
    setChangesOnlyState(value);
    const next = new URLSearchParams(window.location.search);
    if (value) next.set("changes", "1");
    else next.delete("changes");
    window.history.replaceState(null, "", `?${next.toString()}`);
  };
  const showChanges = changesOnly && diffReady;
  const listedKeys = showChanges ? changedKeys : displayedKeys;

  const keyTree = useMemo(
    () =>
      buildNamespaceTree(
        listedKeys.map((entry) => entry.key),
        {
          isMarked: diffReady ? (key) => addedKeySet.has(key) : undefined,
        },
      ),
    [addedKeySet, diffReady, listedKeys],
  );

  // Selection lives in `?ns=` so it survives reloads and can be shared. It is
  // written with history.replaceState (which Next.js syncs into
  // useSearchParams) to keep arrow-key navigation cheap.
  const [selectedNs, setSelectedNs] = useState(() => params.get("ns") ?? "");
  const selectNamespace = useCallback((ns: string) => {
    setSelectedNs(ns);
    const next = new URLSearchParams(window.location.search);
    if (ns) next.set("ns", ns);
    else next.delete("ns");
    window.history.replaceState(null, "", `?${next.toString()}`);
  }, []);
  // A namespace with no (matching) keys falls back to all keys.
  const activeNs = findNamespace(keyTree, selectedNs) ? selectedNs : "";
  const activePath = namespacePath(keyTree, activeNs);

  // Explicit open/closed choices override the defaults.
  const [openOverrides, setOpenOverrides] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const defaultOpen = useMemo(
    () => defaultOpenNamespaces(keyTree, activeNs, isFiltering),
    [activeNs, isFiltering, keyTree],
  );
  const isNamespaceOpen = useCallback(
    (ns: string) => openOverrides.get(ns) ?? defaultOpen.has(ns),
    [defaultOpen, openOverrides],
  );
  const setNamespaceOpen = useCallback((ns: string, open: boolean) => {
    setOpenOverrides((prev) => new Map(prev).set(ns, open));
  }, []);

  const namespaceKeys = useMemo(
    () => listedKeys.filter((entry) => inNamespace(entry.key, activeNs)),
    [activeNs, listedKeys],
  );

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

  // Returning from a key's find page: restore the scroll position once the
  // keys have rendered (browser restoration ran against the skeleton).
  useEffect(() => {
    if (loading) return;
    const y = takeScrollRestore(
      withoutBasePath(window.location.pathname) + window.location.search,
    );
    if (y !== null) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [loading]);

  const filterControls = (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id={FILTER_INPUT_ID}
        type="text"
        placeholder="Filter entitlement keys..."
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
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  const versionPanelProps = {
    activeCompareTag,
    build,
    compareWith,
    group,
    groupedVersions,
    setCompareWith,
    switchVersion,
    versionsCount: versions.length,
  };

  const breadcrumb = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 font-mono text-sm">
      {activePath.map((node, i) => {
        const last = i === activePath.length - 1;
        return (
          <span key={node.ns || "(all)"} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <button
              type="button"
              onClick={() => selectNamespace(node.ns)}
              disabled={last}
              className={cn(
                "rounded px-1 transition-colors",
                last
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                i === 0 && "font-sans",
              )}
            >
              {i === 0 ? "All keys" : node.label}
            </button>
          </span>
        );
      })}
      <span className="ml-1 font-sans text-xs tabular-nums text-muted-foreground">
        {namespaceKeys.length}
        {isFiltering && !activeNs && ` of ${keys.length}`}
      </span>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 [grid-area:toolbar]">
      {breadcrumb}

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm">
        {activeCompareTag && (
          <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300/60 bg-emerald-50 pl-2 pr-0.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <GitCompare className="h-3.5 w-3.5" />
            vs {compareVersion?.version ?? activeCompareTag}
            <button
              type="button"
              onClick={() => setCompareWith(null)}
              className="rounded p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              aria-label="Stop comparing"
              title="Stop comparing"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {compareLoading && activeCompareTag && (
          <span className="text-muted-foreground">Diffing keys…</span>
        )}
        {compareError && activeCompareTag && (
          <span className="text-destructive">Diff unavailable</span>
        )}

        {diffReady && (
          <>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <CirclePlus className="h-3.5 w-3.5" />
              {addedKeys.length} new
            </span>
            {removedKeys.length > 0 && (
              <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
                <CircleMinus className="h-3.5 w-3.5" />
                {removedKeys.length} removed
              </span>
            )}
            {changedKeyCount > 0 && (
              <Button
                type="button"
                variant={changesOnly ? "secondary" : "outline"}
                size="sm"
                onClick={() => setChangesOnly(!changesOnly)}
                className="h-7 gap-1.5 px-2 text-xs"
                aria-pressed={changesOnly}
                title="Show only added and removed keys"
              >
                <ListFilter className="h-3.5 w-3.5" />
                Changed only
              </Button>
            )}
          </>
        )}

        {/* Wide screens show the version panel as a column instead. */}
        {versions.length > 1 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs 2xl:hidden"
              >
                <History className="h-3.5 w-3.5" />
                Versions
                <span className="inline-flex min-w-5 justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {versions.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(calc(100vw-2rem),24rem)] p-3"
              sideOffset={8}
            >
              <VersionHistoryPanel
                {...versionPanelProps}
                className="border-0 bg-transparent p-0"
                listClassName="max-h-[min(65vh,36rem)] overflow-y-auto pr-1"
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );

  const emptyMessage =
    keys.length === 0 ? (
      <p>No entitlement keys found for this OS version.</p>
    ) : showChanges && !isFiltering ? (
      <p>No keys changed between these versions.</p>
    ) : showChanges ? (
      <p>No changed keys match &quot;{keyword}&quot;</p>
    ) : (
      <p>No keys match &quot;{keyword}&quot;</p>
    );

  return (
    <div className="flex h-full flex-col">
      <HeaderPortal>{filterControls}</HeaderPortal>

      {loading ? (
        <KeysSkeleton />
      ) : (
        <div className={keysLayoutClass(versions.length > 1)}>
          {toolbar}

          {listedKeys.length > 0 && (
            <nav className="overflow-y-auto rounded-md border p-1 [grid-area:nav] max-md:max-h-56 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:self-start">
              <NamespaceTree
                tree={keyTree}
                selected={activeNs}
                onSelect={selectNamespace}
                isOpen={isNamespaceOpen}
                onOpenChange={setNamespaceOpen}
              />
            </nav>
          )}

          <section className="min-w-0 [grid-area:list]">
            {listedKeys.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <KeyList entries={namespaceKeys} />
            )}
          </section>

          {versions.length > 1 && (
            <aside className="hidden [grid-area:aside] 2xl:sticky 2xl:top-20 2xl:block 2xl:self-start">
              <VersionHistoryPanel
                {...versionPanelProps}
                className="max-h-[calc(100vh-6rem)]"
                listClassName="min-h-0 flex-1 overflow-y-auto pr-1"
              />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
