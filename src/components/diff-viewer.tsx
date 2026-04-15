"use client";

import { useMemo, useState } from "react";
import { diffPlistKeys, computeKeyLevelDiff, type PlistDiff, type KeyDiffEntry } from "@/lib/plist";
import { Columns2, Rows3, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DiffViewerProps {
  oldXml: string;
  newXml: string;
  oldLabel: string;
  newLabel: string;
}

export function DiffViewer({
  oldXml,
  newXml,
  oldLabel,
  newLabel,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">(
    typeof window !== "undefined" && window.innerWidth < 480 ? "unified" : "split"
  );

  const keysDiff = useMemo(
    () => diffPlistKeys(oldXml, newXml),
    [oldXml, newXml],
  );

  const keyLevelDiff = useMemo(
    () => computeKeyLevelDiff(oldXml, newXml),
    [oldXml, newXml],
  );

  const hasChanges =
    keysDiff.added.length > 0 ||
    keysDiff.removed.length > 0 ||
    keysDiff.changed.length > 0;

  if (!hasChanges) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 border rounded-lg">
        No changes between versions
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DiffSummary diff={keysDiff} />
      <div className="rounded-lg overflow-hidden border bg-muted/30">
        <div className="flex items-center justify-between px-4 py-2 bg-muted text-sm font-medium border-b">
          {viewMode === "unified" ? (
            <>
              <span className="text-red-400">- {oldLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("split")}
                  className="p-1.5 rounded hover:bg-accent transition-colors"
                  title="Split view"
                >
                  <Columns2 className="h-4 w-4" />
                </button>
              </div>
              <span className="text-green-400">+ {newLabel}</span>
            </>
          ) : (
            <>
              <span className="text-red-400 flex-1">- {oldLabel}</span>
              <button
                onClick={() => setViewMode("unified")}
                className="p-1.5 rounded hover:bg-accent transition-colors mx-2"
                title="Unified view"
              >
                <Rows3 className="h-4 w-4" />
              </button>
              <span className="text-green-400 flex-1 text-right">+ {newLabel}</span>
            </>
          )}
        </div>

        {viewMode === "unified" ? (
          <pre className="p-4 overflow-x-auto text-sm font-mono">
            {keyLevelDiff.map((entry, i) => (
              <KeyDiffBlock key={i} entry={entry} mode="unified" />
            ))}
          </pre>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-2 text-sm font-mono min-w-[600px]">
              {keyLevelDiff.map((entry, i) => (
                <KeyDiffBlock key={i} entry={entry} mode="split" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KeyDiffBlock({
  entry,
  mode,
}: {
  entry: KeyDiffEntry;
  mode: "unified" | "split";
}) {
  // Ellipsis marker
  if (entry.key === "···") {
    if (mode === "unified") {
      return (
        <div className="text-muted-foreground py-1">
          <span className="select-none opacity-50 mr-2"> </span>
          ···
        </div>
      );
    }
    return (
      <div className="contents">
        <div className="px-4 py-1 border-r text-muted-foreground">···</div>
        <div className="px-4 py-1 text-muted-foreground">···</div>
      </div>
    );
  }

  const oldLines = entry.oldXml?.split("\n") ?? [];
  const newLines = entry.newXml?.split("\n") ?? [];

  if (mode === "unified") {
    if (entry.type === "context") {
      return (
        <>
          {oldLines.map((line, i) => (
            <div key={i}>
              <span className="select-none opacity-50 mr-2"> </span>
              {line}
            </div>
          ))}
        </>
      );
    }
    if (entry.type === "removed") {
      return (
        <>
          {oldLines.map((line, i) => (
            <div
              key={i}
              className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
            >
              <span className="select-none opacity-50 mr-2">-</span>
              {line}
            </div>
          ))}
        </>
      );
    }
    if (entry.type === "added") {
      return (
        <>
          {newLines.map((line, i) => (
            <div
              key={i}
              className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
            >
              <span className="select-none opacity-50 mr-2">+</span>
              {line}
            </div>
          ))}
        </>
      );
    }
    // changed: show old then new
    return (
      <>
        {oldLines.map((line, i) => (
          <div
            key={`old-${i}`}
            className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
          >
            <span className="select-none opacity-50 mr-2">-</span>
            {line}
          </div>
        ))}
        {newLines.map((line, i) => (
          <div
            key={`new-${i}`}
            className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
          >
            <span className="select-none opacity-50 mr-2">+</span>
            {line}
          </div>
        ))}
      </>
    );
  }

  // Split mode
  if (entry.type === "context") {
    const maxLines = Math.max(oldLines.length, newLines.length);
    return (
      <>
        {Array.from({ length: maxLines }).map((_, i) => (
          <div key={i} className="contents">
            <div className="px-4 py-0.5 border-r whitespace-pre">
              {oldLines[i] ?? ""}
            </div>
            <div className="px-4 py-0.5 whitespace-pre">
              {newLines[i] ?? ""}
            </div>
          </div>
        ))}
      </>
    );
  }

  if (entry.type === "removed") {
    return (
      <>
        {oldLines.map((line, i) => (
          <div key={i} className="contents">
            <div className="px-4 py-0.5 border-r bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 whitespace-pre">
              {line}
            </div>
            <div className="px-4 py-0.5 bg-muted/50" />
          </div>
        ))}
      </>
    );
  }

  if (entry.type === "added") {
    return (
      <>
        {newLines.map((line, i) => (
          <div key={i} className="contents">
            <div className="px-4 py-0.5 border-r bg-muted/50" />
            <div className="px-4 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 whitespace-pre">
              {line}
            </div>
          </div>
        ))}
      </>
    );
  }

  // changed: pair up lines side by side
  const maxLines = Math.max(oldLines.length, newLines.length);
  return (
    <>
      {Array.from({ length: maxLines }).map((_, i) => (
        <div key={i} className="contents">
          <div
            className={`px-4 py-0.5 border-r whitespace-pre ${
              oldLines[i]
                ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                : "bg-muted/50"
            }`}
          >
            {oldLines[i] ?? ""}
          </div>
          <div
            className={`px-4 py-0.5 whitespace-pre ${
              newLines[i]
                ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                : "bg-muted/50"
            }`}
          >
            {newLines[i] ?? ""}
          </div>
        </div>
      ))}
    </>
  );
}

function DiffSummary({ diff }: { diff: PlistDiff }) {
  const totalChanges = diff.added.length + diff.removed.length + diff.changed.length;

  const summaryParts = [];
  if (diff.added.length > 0) summaryParts.push(`${diff.added.length} added`);
  if (diff.removed.length > 0) summaryParts.push(`${diff.removed.length} removed`);
  if (diff.changed.length > 0) summaryParts.push(`${diff.changed.length} changed`);

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm hover:bg-accent px-2 py-1.5 -mx-2 rounded transition-colors group w-full text-left">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <span className="font-medium">{totalChanges} changes</span>
        <span className="text-muted-foreground">({summaryParts.join(", ")})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-6 space-y-3">
        {diff.added.length > 0 && (
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-3 h-3 rounded bg-green-500 shrink-0" />
              <strong>{diff.added.length}</strong> <span className="text-muted-foreground">added</span>
            </div>
            <div className="pl-5 flex flex-wrap gap-1">
              {diff.added.map((key) => (
                <code key={key} className="text-xs bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                  {key}
                </code>
              ))}
            </div>
          </div>
        )}
        {diff.removed.length > 0 && (
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-3 h-3 rounded bg-red-500 shrink-0" />
              <strong>{diff.removed.length}</strong> <span className="text-muted-foreground">removed</span>
            </div>
            <div className="pl-5 flex flex-wrap gap-1">
              {diff.removed.map((key) => (
                <code key={key} className="text-xs bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                  {key}
                </code>
              ))}
            </div>
          </div>
        )}
        {diff.changed.length > 0 && (
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-3 h-3 rounded bg-yellow-500 shrink-0" />
              <strong>{diff.changed.length}</strong> <span className="text-muted-foreground">changed</span>
            </div>
            <div className="pl-5 flex flex-wrap gap-1">
              {diff.changed.map((key) => (
                <code key={key} className="text-xs bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">
                  {key}
                </code>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
