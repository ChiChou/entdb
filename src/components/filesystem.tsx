import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Button } from "@/components/ui/button";

import filesToTree, { type TreeWithFullPath } from "@/lib/tree";
import Link from "next/link";

function Tree({ item, os }: { item: TreeWithFullPath; os: string }) {
  return (
    <ul className="ml-2 pl-2">
      {Object.entries(item).map(([key, value]) => {
        if (typeof value === "string") {
          return (
            <li key={value} className="font-mono break-all text-sm m-2">
              <Link
                href={`/os/bin?path=${encodeURIComponent(value)}&os=${os}`}
                className="hover:underline"
              >
                /{key}
              </Link>
            </li>
          );
        } else {
          return (
            <li key={key}>
              <ul className="pl-2 border-l ml-2">
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <Button className="break-all" variant="outline">
                      /{key}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Tree item={value} os={os} />
                  </CollapsibleContent>
                </Collapsible>
              </ul>
            </li>
          );
        }
      })}
    </ul>
  );
}

export default function FileSystem({
  list,
  os,
}: {
  list: string[];
  os: string;
}) {
  const tree = filesToTree(list);
  return (
    <div className="mt-8">
      <Tree item={tree} os={os}></Tree>
    </div>
  );
}
