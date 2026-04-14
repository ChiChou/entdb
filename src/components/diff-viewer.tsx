"use client";

import { useMemo } from "react";
import { diffPlistKeys, type PlistDiff } from "@/lib/plist";

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

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const result: DiffLine[] = [];
  let oi = 0,
    ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    const oldLine = oldLines[oi];
    const newLine = newLines[ni];

    if (oi < oldLines.length && ni < newLines.length && oldLine === newLine) {
      // Skip context lines - only show changes
      oi++;
      ni++;
    } else if (oi < oldLines.length && !newSet.has(oldLine)) {
      result.push({ type: "remove", content: oldLine, oldNum: oi + 1 });
      oi++;
    } else if (ni < newLines.length && !oldSet.has(newLine)) {
      result.push({ type: "add", content: newLine, newNum: ni + 1 });
      ni++;
    } else {
      oi++;
      ni++;
    }
  }

  return result;
}

export function DiffViewer({
  oldXml,
  newXml,
  oldLabel,
  newLabel,
}: DiffViewerProps) {
  const keysDiff = useMemo(
    () => diffPlistKeys(oldXml, newXml),
    [oldXml, newXml],
  );

  const diffLines = useMemo(
    () => computeDiff(oldXml, newXml),
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
      <div className="rounded-lg overflow-hidden border bg-gray-900 text-gray-100">
        <div className="flex justify-between px-4 py-2 bg-gray-800 text-sm font-medium border-b border-gray-700">
          <span className="text-red-400">- {oldLabel}</span>
          <span className="text-green-400">+ {newLabel}</span>
        </div>
        <pre className="p-4 overflow-x-auto text-xs font-mono">
          {diffLines.map((line, i) => (
            <div
              key={i}
              className={
                line.type === "remove"
                  ? "bg-red-900/40 text-red-200"
                  : line.type === "add"
                    ? "bg-green-900/40 text-green-200"
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
      </div>
    </div>
  );
}

function DiffSummary({ diff }: { diff: PlistDiff }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {diff.added.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-green-500" />
          <span>
            <strong>{diff.added.length}</strong> added:{" "}
            <code className="text-xs">{diff.added.join(", ")}</code>
          </span>
        </div>
      )}
      {diff.removed.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-red-500" />
          <span>
            <strong>{diff.removed.length}</strong> removed:{" "}
            <code className="text-xs">{diff.removed.join(", ")}</code>
          </span>
        </div>
      )}
      {diff.changed.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-yellow-500" />
          <span>
            <strong>{diff.changed.length}</strong> changed:{" "}
            <code className="text-xs">{diff.changed.join(", ")}</code>
          </span>
        </div>
      )}
    </div>
  );
}
