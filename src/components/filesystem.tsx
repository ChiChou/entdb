import { useState } from "react";
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

function Tree({
  item,
  os,
  depth,
  expandAll,
}: {
  item: TreeWithFullPath;
  os: string;
  depth: number;
  expandAll: boolean;
}) {
  return (
    <ul className="space-y-0.5">
      {Object.entries(item).map(([key, value]) => {
        if (typeof value === "string") {
          return (
            <li key={value} className="flex items-center gap-2 py-1 pl-1">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Link
                href={`/os/bin?path=${encodeURIComponent(value)}&os=${os}`}
                className="font-mono text-sm hover:underline hover:text-foreground text-muted-foreground truncate"
                title={value}
              >
                {key}
              </Link>
            </li>
          );
        } else {
          return (
            <TreeFolder
              key={key}
              name={key}
              item={value}
              os={os}
              depth={depth}
              expandAll={expandAll}
            />
          );
        }
      })}
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
  expandAll: boolean;
}) {
  const [open, setOpen] = useState(expandAll || depth < 1);
  const itemCount = countItems(item);

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
          <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {itemCount}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 pl-2 border-l border-border">
            <Tree item={item} os={os} depth={depth + 1} expandAll={expandAll} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export default function FileSystem({
  list,
  os,
  expandAll = false,
}: {
  list: string[];
  os: string;
  expandAll?: boolean;
}) {
  const tree = filesToTree(list);
  return (
    <div>
      <Tree item={tree} os={os} depth={0} expandAll={expandAll} />
    </div>
  );
}
