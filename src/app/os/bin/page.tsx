"use client";

import { useEffect, useState } from "react";
import { redirect, useSearchParams } from "next/navigation";
import {
  createElement,
  Prism as SyntaxHighlighter,
} from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

import { CopyButton } from "@/components/copy-button";

import { addBasePath } from "@/lib/env";
import { create } from "@/lib/kv";

// type leaf = string | number | boolean;

// interface Entitlements {
//   [key: string]: leaf | Entitlements | leaf[];
// }

export default function BinaryDetail() {
  const params = useSearchParams();
  const os = params.get("os");
  const path = params.get("path");

  useEffect(() => {
    if (os && path) {
      document.title = `${path} | ${os} - Entitlement Database`;
    }
  });

  if (typeof os !== "string" || typeof path !== "string") {
    redirect("/404");
  }

  const [xml, setXML] = useState<string | "">("");
  const [xmlKeys, setXMLKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const reader = await create(addBasePath(`/data/${os!}/blobs`));
      const blob = await reader.get(path!);

      const location = blob.search(/<\/plist>\s*{/i);
      if (location === -1) {
        throw new Error(`Invalid blob response ${blob}`);
      }

      const xml = blob.substring(0, location + 8);
      const json = JSON.parse(blob.substring(location + 8));

      setXML(xml);
      setXMLKeys(new Set(Object.keys(json)));
    }

    load();
  }, [os, path]);

  return (
    <div>
      <main className="space-y-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold">Entitlements of</h2>
            <p>
              <code className="text-red-800 break-all font-thin text-sm">
                {path}
              </code>
            </p>
          </div>
          <CopyButton text={xml} />
        </div>

        <SyntaxHighlighter
          language="xml"
          showLineNumbers={true}
          style={tomorrow}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
          renderer={({ rows, stylesheet, useInlineStyles }) => {
            function addLink(node: rendererNode) {
              if (node.type === "text" && xmlKeys.has(node.value as string)) {
                return {
                  type: "element",
                  tagName: "span",
                  children: [
                    {
                      type: "element",
                      tagName: "a",
                      children: [
                        {
                          type: "text",
                          value: node.value as string,
                        } as rendererNode,
                      ],
                      properties: {
                        className: ["text-blue-200", "hover:underline"],
                        href: addBasePath(
                          `/os/find?key=${encodeURIComponent(
                            node.value as string,
                          )}&os=${encodeURIComponent(os!)}`,
                        ),
                      },
                    } as rendererNode,
                  ],
                  properties: { className: ["linked-key"] },
                } as rendererNode;
              }

              if (node.children) {
                node.children = node.children.map(addLink);
              }
              return node;
            }

            return rows.map((row, i) => {
              return createElement({
                node: addLink(row),
                stylesheet,
                useInlineStyles,
                key: `code-segment-${i}`,
              });
            });
          }}
        >
          {xml}
        </SyntaxHighlighter>
      </main>
    </div>
  );
}
