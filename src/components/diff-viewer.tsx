"use client";

import { useMemo } from "react";
import { diffPlistKeys, type PlistDiff } from "@/lib/plist";

interface DiffLine {
  type: "unchanged" | "added" | "removed" | "changed";
  oldLine?: string;
  newLine?: string;
  key?: string;
}

function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const maxLen = Math.max(oldLines.length, newLines.length);

  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    const oldLine = oldLines[oi];
    const newLine = newLines[ni];

    if (oldLine === newLine) {
      result.push({ type: "unchanged", oldLine, newLine });
      oi++;
      ni++;
    } else if (oldLine && !newSet.has(oldLine)) {
      result.push({ type: "removed", oldLine, newLine: undefined });
      oi++;
    } else if (newLine && !oldSet.has(newLine)) {
      result.push({ type: "added", oldLine: undefined, newLine });
      ni++;
    } else {
      result.push({ type: "changed", oldLine, newLine });
      oi++;
      ni++;
    }
  }

  return result;
}

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
  const diff = useMemo(() => diffPlistKeys(oldXml, newXml), [oldXml, newXml]);

  const oldLines = useMemo(
    () => oldXml.split("\n").filter((l) => l.trim()),
    [oldXml],
  );
  const newLines = useMemo(
    () => newXml.split("\n").filter((l) => l.trim()),
    [newXml],
  );

  const lineDiff = useMemo(
    () => computeLineDiff(oldLines, newLines),
    [oldLines, newLines],
  );

  return (
    <div className="space-y-4">
      <DiffSummary diff={diff} />
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-t px-3 py-2 font-semibold border-b">
          {oldLabel}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-t px-3 py-2 font-semibold border-b">
          {newLabel}
        </div>
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-2">
            {lineDiff.map((line, i) => (
              <DiffLineRow key={i} line={line} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const baseClasses = "px-3 py-0.5 font-mono text-xs whitespace-pre overflow-x-auto";

  switch (line.type) {
    case "unchanged":
      return (
        <>
          <div className={`${baseClasses} bg-gray-50 dark:bg-gray-900`}>
            {line.oldLine}
          </div>
          <div className={`${baseClasses} bg-gray-50 dark:bg-gray-900`}>
            {line.newLine}
          </div>
        </>
      );
    case "removed":
      return (
        <>
          <div className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200`}>
            {line.oldLine}
          </div>
          <div className={`${baseClasses} bg-gray-100 dark:bg-gray-800`} />
        </>
      );
    case "added":
      return (
        <>
          <div className={`${baseClasses} bg-gray-100 dark:bg-gray-800`} />
          <div className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200`}>
            {line.newLine}
          </div>
        </>
      );
    case "changed":
      return (
        <>
          <div className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200`}>
            {line.oldLine}
          </div>
          <div className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200`}>
            {line.newLine}
          </div>
        </>
      );
  }
}

function DiffSummary({ diff }: { diff: PlistDiff }) {
  const hasChanges =
    diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;

  if (!hasChanges) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No changes in root-level keys
      </div>
    );
  }

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
