"use client";

import { useMemo } from "react";
import { FileDiff } from "@pierre/diffs/react";
import { parseDiffFromFile } from "@pierre/diffs";

import { diffPlistKeys, type PlistDiff } from "@/lib/plist";

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
  const keysDiff = useMemo(
    () => diffPlistKeys(oldXml, newXml),
    [oldXml, newXml],
  );

  const fileDiff = useMemo(
    () =>
      parseDiffFromFile(
        { name: `${oldLabel}.plist`, contents: oldXml },
        { name: `${newLabel}.plist`, contents: newXml },
      ),
    [oldXml, newXml, oldLabel, newLabel],
  );

  return (
    <div className="space-y-4">
      <DiffSummary diff={keysDiff} />
      <div className="rounded-lg overflow-hidden border text-sm">
        <FileDiff fileDiff={fileDiff} options={{ diffStyle: "split" }} />
      </div>
    </div>
  );
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
