import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, FileText, Folder } from "lucide-react";

import filesToTree, { type TreeWithFullPath } from "@/lib/tree";
import Link from "next/link";

function countItems(item: TreeWithFullPath): number {
  let count = 0;
  for (const value of Object.values(item)) {
    if (typeof value === "string") {
      count++;
    } else {
      count += countItems(value);
    }
  }
  return count;
}

function getMaxDepth(item: TreeWithFullPath, current = 0): number {
  let max = current;
  for (const value of Object.values(item)) {
    if (typeof value !== "string") {
      max = Math.max(max, getMaxDepth(value, current + 1));
    }
  }
  return max;
}

function FileItem({
  name,
  fullPath,
  os,
}: {
  name: string;
  fullPath: string;
  os: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-1 hover:bg-accent rounded transition-colors">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Link
        href={`/os/bin?path=${encodeURIComponent(fullPath)}&os=${os}`}
        className="font-mono text-sm hover:underline text-muted-foreground hover:text-foreground truncate"
        title={fullPath}
      >
        {name}
      </Link>
    </div>
  );
}

function Tree({
  item,
  os,
  depth,
  expandAll,
}: {
  item: TreeWithFullPath;
  os: string;
  depth: number;
  expandAll: boolean | null;
}) {
  const entries = Object.entries(item);
  const files = entries.filter(([, v]) => typeof v === "string");
  const folders = entries.filter(([, v]) => typeof v !== "string");

  return (
    <ul className="space-y-0.5">
      {folders.map(([key, value]) => (
        <TreeFolder
          key={key}
          name={key}
          item={value as TreeWithFullPath}
          os={os}
          depth={depth}
          expandAll={expandAll}
        />
      ))}
      {files.map(([key, value]) => (
        <li key={value as string}>
          <FileItem
            name={key}
            fullPath={value as string}
            os={os}
          />
        </li>
      ))}
    </ul>
  );
}

function TreeFolder({
  name,
  item,
  os,
  depth,
  expandAll,
}: {
  name: string;
  item: TreeWithFullPath;
  os: string;
  depth: number;
  expandAll: boolean | null;
}) {
  const [open, setOpen] = useState(expandAll === true || (expandAll === null && depth < 1));
  const itemCount = countItems(item);
  const maxDepth = getMaxDepth(item);
  const isShallow = maxDepth === 0;

  useEffect(() => {
    if (expandAll !== null) {
      setOpen(expandAll);
    }
  }, [expandAll]);

  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 py-1 pl-1 w-full hover:bg-accent rounded transition-colors text-left group">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-mono text-sm truncate">{name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {itemCount}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={isShallow ? "ml-6 mt-1 space-y-0.5" : "ml-4 pl-2 border-l border-border"}>
            {isShallow ? (
              Object.entries(item).map(([key, value]) => (
                <FileItem
                  key={value as string}
                  name={key}
                  fullPath={value as string}
                  os={os}
                />
              ))
            ) : (
              <Tree item={item} os={os} depth={depth + 1} expandAll={expandAll} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export default function FileSystem({
  list,
  os,
  expandAll = null,
}: {
  list: string[];
  os: string;
  expandAll?: boolean | null;
}) {
  const tree = filesToTree(list);
  return (
    <div>
      <Tree item={tree} os={os} depth={0} expandAll={expandAll} />
    </div>
  );
}
