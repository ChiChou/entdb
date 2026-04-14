"use client";

import { useMemo, useState } from "react";
import { diffPlistKeys, type PlistDiff } from "@/lib/plist";
import { Columns2, Rows3, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DiffViewerProps {
  oldXml: string;
  newXml: string;
  oldLabel: string;
  newLabel: string;
}

type DiffLine = {
  type: "context" | "add" | "remove";
  content: string;
  oldNum?: number;
  newNum?: number;
};

type SplitRow = {
  left?: { num?: number; content: string; type: "context" | "remove" };
  right?: { num?: number; content: string; type: "context" | "add" };
};

function computeDiff(oldText: string, newText: string, contextLines = 3): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const rawDiff: DiffLine[] = [];
  let oi = 0,
    ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    const oldLine = oldLines[oi];
    const newLine = newLines[ni];

    if (oi < oldLines.length && ni < newLines.length && oldLine === newLine) {
      rawDiff.push({ type: "context", content: oldLine, oldNum: oi + 1, newNum: ni + 1 });
      oi++;
      ni++;
    } else if (oi < oldLines.length && !newSet.has(oldLine)) {
      rawDiff.push({ type: "remove", content: oldLine, oldNum: oi + 1 });
      oi++;
    } else if (ni < newLines.length && !oldSet.has(newLine)) {
      rawDiff.push({ type: "add", content: newLine, newNum: ni + 1 });
      ni++;
    } else {
      rawDiff.push({ type: "context", content: oldLine, oldNum: oi + 1, newNum: ni + 1 });
      oi++;
      ni++;
    }
  }

  const includeLines = new Set<number>();
  rawDiff.forEach((line, idx) => {
    if (line.type !== "context") {
      for (let i = Math.max(0, idx - contextLines); i <= Math.min(rawDiff.length - 1, idx + contextLines); i++) {
        includeLines.add(i);
      }
    }
  });

  const result: DiffLine[] = [];
  let lastIncluded = -1;

  rawDiff.forEach((line, idx) => {
    if (includeLines.has(idx)) {
      if (lastIncluded !== -1 && idx - lastIncluded > 1) {
        result.push({ type: "context", content: "···", oldNum: undefined, newNum: undefined });
      }
      result.push(line);
      lastIncluded = idx;
    }
  });

  return result;
}

function computeSplitDiff(diffLines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;

  while (i < diffLines.length) {
    const line = diffLines[i];

    if (line.type === "context") {
      rows.push({
        left: { num: line.oldNum, content: line.content, type: "context" },
        right: { num: line.newNum, content: line.content, type: "context" },
      });
      i++;
    } else if (line.type === "remove") {
      // Collect consecutive removes
      const removes: DiffLine[] = [];
      while (i < diffLines.length && diffLines[i].type === "remove") {
        removes.push(diffLines[i]);
        i++;
      }
      // Collect consecutive adds
      const adds: DiffLine[] = [];
      while (i < diffLines.length && diffLines[i].type === "add") {
        adds.push(diffLines[i]);
        i++;
      }
      // Pair them up
      const maxLen = Math.max(removes.length, adds.length);
      for (let j = 0; j < maxLen; j++) {
        const row: SplitRow = {};
        if (j < removes.length) {
          row.left = { num: removes[j].oldNum, content: removes[j].content, type: "remove" };
        }
        if (j < adds.length) {
          row.right = { num: adds[j].newNum, content: adds[j].content, type: "add" };
        }
        rows.push(row);
      }
    } else if (line.type === "add") {
      rows.push({
        right: { num: line.newNum, content: line.content, type: "add" },
      });
      i++;
    }
  }

  return rows;
}

export function DiffViewer({
  oldXml,
  newXml,
  oldLabel,
  newLabel,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">("split");

  const keysDiff = useMemo(
    () => diffPlistKeys(oldXml, newXml),
    [oldXml, newXml],
  );

  const diffLines = useMemo(
    () => computeDiff(oldXml, newXml),
    [oldXml, newXml],
  );

  const splitRows = useMemo(
    () => computeSplitDiff(diffLines),
    [diffLines],
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
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "remove"
                    ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                    : line.type === "add"
                      ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                      : ""
                }
              >
                <span className="select-none opacity-50 mr-2">
                  {line.type === "remove" ? "-" : line.type === "add" ? "+" : " "}
                </span>
                {line.content}
              </div>
            ))}
          </pre>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-2 text-sm font-mono min-w-[600px]">
              {splitRows.map((row, i) => (
                <div key={i} className="contents">
                  <div
                    className={`px-4 py-0.5 border-r ${
                      row.left?.type === "remove"
                        ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                        : row.left
                          ? ""
                          : "bg-muted/50"
                    }`}
                  >
                    {row.left && (
                      <>
                        <span className="select-none opacity-50 mr-2 inline-block w-8 text-right">
                          {row.left.num ?? ""}
                        </span>
                        {row.left.content}
                      </>
                    )}
                  </div>
                  <div
                    className={`px-4 py-0.5 ${
                      row.right?.type === "add"
                        ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                        : row.right
                          ? ""
                          : "bg-muted/50"
                    }`}
                  >
                    {row.right && (
                      <>
                        <span className="select-none opacity-50 mr-2 inline-block w-8 text-right">
                          {row.right.num ?? ""}
                        </span>
                        {row.right.content}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
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
