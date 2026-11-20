import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Minus,
  Plus,
} from "lucide-react";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ValuePreview } from "@/components/value-preview";
import filesToTree, { type TreeWithFullPath } from "@/lib/tree";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type PathStatus = "added" | "removed";

/**
 * Optional diff marks: which paths were gained/lost, and which OS a lost path
 * should link to (it no longer exists in the current one).
 */
interface Marks {
  status?: (path: string) => PathStatus | undefined;
  osFor?: (path: string) => string | undefined;
  /** Shows each binary's entitlement value next to its name. */
  valueFor?: (path: string) => unknown;
  /** Atoms to mark in the values (the active value filter). */
  highlight?: readonly string[];
  /** Clicking a value item toggles it in the value filter. */
  onPickValue?: (atom: string) => void;
}

const MarksContext = createContext<Marks>({});
const NO_HIGHLIGHT: readonly string[] = [];

function countMarks(item: TreeWithFullPath, status: Marks["status"]) {
  let added = 0;
  let removed = 0;
  if (!status) return { added, removed };
  for (const value of Object.values(item)) {
    if (typeof value === "string") {
      const mark = status(value);
      if (mark === "added") added++;
      else if (mark === "removed") removed++;
    } else {
      const sub = countMarks(value, status);
      added += sub.added;
      removed += sub.removed;
    }
  }
  return { added, removed };
}

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

const FileItem = memo(function FileItem({
  name,
  fullPath,
  os,
}: {
  name: string;
  fullPath: string;
  os: string;
}) {
  const marks = useContext(MarksContext);
  const mark = marks.status?.(fullPath);
  const linkOs = marks.osFor?.(fullPath) ?? os;
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 px-1 rounded transition-colors",
        mark === "added"
          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
          : mark === "removed"
            ? "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            : "hover:bg-accent",
      )}
    >
      {mark ? (
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            mark === "removed"
              ? "border-red-300/70 dark:border-red-700"
              : "border-emerald-300/70 dark:border-emerald-700",
          )}
          title={mark === "removed" ? "Lost" : "Gained"}
          aria-label={mark === "removed" ? "Lost" : "Gained"}
        >
          {mark === "removed" ? (
            <Minus className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </span>
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <Link
        data-nav-item
        data-tree-row
        href={`/os/bin?path=${encodeURIComponent(fullPath)}&os=${linkOs}`}
        className={cn(
          "font-mono text-sm hover:underline truncate",
          marks.valueFor && "sm:max-w-[60%] sm:shrink-0",
        )}
        title={fullPath}
      >
        {name.includes("/") && (
          <span className={mark ? "opacity-70" : "text-key-prefix"}>
            {name.slice(0, name.lastIndexOf("/") + 1)}
          </span>
        )}
        {name.slice(name.lastIndexOf("/") + 1)}
      </Link>
      {marks.valueFor && (
        <ValuePreview
          value={marks.valueFor(fullPath)}
          highlight={marks.highlight ?? NO_HIGHLIGHT}
          onPick={marks.onPickValue}
          className="ml-3 hidden sm:flex"
        />
      )}
    </div>
  );
});

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
          <FileItem name={key} fullPath={value as string} os={os} />
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
  const [open, setOpen] = useState(
    expandAll === true || (expandAll === null && depth < 1),
  );
  const itemCount = countItems(item);
  const marks = useContext(MarksContext);
  const changed = useMemo(
    () => countMarks(item, marks.status),
    [item, marks.status],
  );
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
        <CollapsibleTrigger
          data-nav-item
          data-tree-row
          data-tree-folder
          className="flex items-center gap-2 py-1 pl-1 w-full hover:bg-accent rounded transition-colors text-left group outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Folder className="h-4 w-4 shrink-0 text-folder" />
          <span className="font-mono text-sm truncate">{name}</span>
          <span className="ml-2 text-xs tabular-nums text-muted-foreground">
            {itemCount}
          </span>
          {changed.added > 0 && (
            <span className="text-xs tabular-nums text-emerald-700 dark:text-emerald-300">
              +{changed.added}
            </span>
          )}
          {changed.removed > 0 && (
            <span className="text-xs tabular-nums text-red-700 dark:text-red-300">
              −{changed.removed}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent data-tree-content>
          <div
            className={
              isShallow
                ? "ml-6 mt-1 space-y-0.5"
                : "ml-4 pl-2 border-l border-border"
            }
          >
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
              <Tree
                item={item}
                os={os}
                depth={depth + 1}
                expandAll={expandAll}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/**
 * Arrow keys over the tree's focusable rows (folder toggles and file links):
 * ↑/↓ move, → opens a folder or steps into it, ← closes it or goes to the
 * parent folder, Home/End jump. Same model as the keys page's namespace tree.
 */
function onTreeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const current = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-tree-row]",
  );
  if (!current) return;
  const rows = [
    ...event.currentTarget.querySelectorAll<HTMLElement>("[data-tree-row]"),
  ].filter((row) => row.getClientRects().length > 0);
  const index = rows.indexOf(current);
  const isFolder = current.hasAttribute("data-tree-folder");
  const isOpen = current.getAttribute("data-state") === "open";
  const parentFolder = () =>
    current
      .closest("[data-tree-content]")
      ?.parentElement?.querySelector<HTMLElement>(
        ":scope > [data-tree-folder]",
      );

  let next: HTMLElement | null | undefined;
  switch (event.key) {
    case "ArrowDown":
      next = rows[index + 1];
      break;
    case "ArrowUp":
      next = rows[index - 1];
      break;
    case "Home":
      next = rows[0];
      break;
    case "End":
      next = rows.at(-1);
      break;
    case "ArrowRight":
      if (isFolder && !isOpen) current.click();
      else if (isFolder) next = rows[index + 1];
      else return;
      break;
    case "ArrowLeft":
      if (isFolder && isOpen) current.click();
      else next = parentFolder();
      break;
    default:
      return;
  }
  event.preventDefault();
  next?.focus();
  next?.scrollIntoView({ block: "nearest" });
}

const FileSystem = memo(function FileSystem({
  list,
  os,
  expandAll = null,
  status,
  osFor,
  valueFor,
  highlight,
  onPickValue,
}: {
  list: string[];
  os: string;
  expandAll?: boolean | null;
} & Marks) {
  const tree = useMemo(() => filesToTree(list), [list]);
  const marks = useMemo(
    () => ({ status, osFor, valueFor, highlight, onPickValue }),
    [status, osFor, valueFor, highlight, onPickValue],
  );
  return (
    <MarksContext.Provider value={marks}>
      <div onKeyDown={onTreeKeyDown}>
        <Tree item={tree} os={os} depth={0} expandAll={expandAll} />
      </div>
    </MarksContext.Provider>
  );
});

export default FileSystem;
