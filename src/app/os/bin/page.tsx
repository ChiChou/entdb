"use client";

import { useEffect, useState, useMemo } from "react";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import {
  createElement,
  Prism as SyntaxHighlighter,
} from "react-syntax-highlighter";
import { tomorrow, prism } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";

import Link from "next/link";
import { GitCompare, Download } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { DiffViewer } from "@/components/diff-viewer";

import { withBase } from "@/lib/env";
import { createEngine } from "@/lib/engine";
import type { PathHistory } from "@/lib/engine/types";
import { normalizePlist } from "@/lib/plist";

export default function BinaryDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const os = params.get("os");
  const path = params.get("path");

  const [group, build] = os ? os.split("/") : ["", ""];

  useEffect(() => {
    if (os && path) {
      document.title = `${path} | ${os} - Entitlement Database`;
    }
  });

  if (typeof os !== "string" || typeof path !== "string") {
    redirect("/404");
  }

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [xml, setXML] = useState<string>("");
  const [xmlKeys, setXMLKeys] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PathHistory[]>([]);
  const [compareXml, setCompareXml] = useState<string>("");
  const [compareLoading, setCompareLoading] = useState(false);

  // Read compareWith from URL
  const compareWith = params.get("diff");

  const setCompareWith = (value: string | null) => {
    const newParams = new URLSearchParams(params.toString());
    if (value) {
      newParams.set("diff", value);
    } else {
      newParams.delete("diff");
    }
    router.replace(`/os/bin?${newParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const syntaxTheme = mounted && resolvedTheme === "light" ? prism : tomorrow;

  useEffect(() => {
    async function load() {
      const engine = await createEngine(group);
      const rawXml = await engine.getBinaryXML(build, path!);

      try {
        const prettified = normalizePlist(rawXml);
        setXML(prettified);

        const parser = new DOMParser();
        const doc = parser.parseFromString(rawXml, "application/xml");
        const keys = new Set<string>();
        const keyElements = doc.querySelectorAll("dict > key");
        keyElements.forEach((el) => keys.add(el.textContent || ""));
        setXMLKeys(keys);
      } catch {
        setXML(rawXml);
      }

      const hist = await engine.getPathHistory(path!);
      setHistory(hist);
    }

    setLoading(true);
    load().finally(() => setLoading(false));
  }, [group, build, path]);

  useEffect(() => {
    if (!compareWith || !group) {
      setCompareXml("");
      return;
    }

    async function loadCompare() {
      const engine = await createEngine(group);
      const rawXml = await engine.getBinaryXML(compareWith!, path!);
      const prettified = normalizePlist(rawXml);
      setCompareXml(prettified);
    }

    setCompareLoading(true);
    loadCompare()
      .catch(() => setCompareXml(""))
      .finally(() => setCompareLoading(false));
  }, [group, compareWith, path]);

  const availableHistory = history.filter((h) => h.available);

  const groupedHistory = useMemo(() => {
    const groups: { [major: string]: typeof availableHistory } = {};
    for (const h of availableHistory) {
      const major = h.os.version.split(".")[0];
      if (!groups[major]) groups[major] = [];
      groups[major].push(h);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a));
  }, [availableHistory]);

  const switchVersion = (versionTag: string) => {
    router.push(
      `/os/bin?os=${encodeURIComponent(group + "/" + versionTag)}&path=${encodeURIComponent(path!)}`
    );
  };

  const hasVersionHistory = availableHistory.length > 1;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Version history sidebar - on right */}
      {hasVersionHistory && (
        <aside className="lg:w-64 shrink-0 order-2 lg:order-last">
          <div className="lg:sticky lg:top-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              Version History ({availableHistory.length})
            </h3>
            <div className="space-y-1">
              {groupedHistory.map(([major, versions]) => (
                <details
                  key={major}
                  open={versions.some(
                    (h) =>
                      h.os.build === build ||
                      `${h.os.version}_${h.os.build}` === build
                  )}
                  className="group"
                >
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent">
                    <span className="group-open:rotate-90 transition-transform text-xs">
                      ▶
                    </span>
                    <span className="flex-1">{group === "iOS" ? "iOS" : group} {major}.x</span>
                    <span className="text-xs text-muted-foreground/60">
                      {versions.length}
                    </span>
                  </summary>
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {versions.map((h) => {
                      const isCurrent =
                        h.os.build === build ||
                        `${h.os.version}_${h.os.build}` === build;
                      const versionTag = `${h.os.version}_${h.os.build}`;
                      const isComparing = compareWith === versionTag;

                      return (
                        <div
                          key={h.os.build}
                          className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                            isCurrent
                              ? "bg-primary text-primary-foreground font-medium"
                              : isComparing
                                ? "bg-yellow-100 dark:bg-yellow-900/50"
                                : "hover:bg-accent"
                          }`}
                        >
                          <button
                            onClick={() => !isCurrent && switchVersion(versionTag)}
                            disabled={isCurrent}
                            className={`flex-1 text-left ${
                              isCurrent
                                ? "cursor-default"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {h.os.version}
                            {isCurrent && (
                              <span className="ml-1 text-xs opacity-70">
                                (current)
                              </span>
                            )}
                            {isComparing && (
                              <span className="ml-1 text-xs text-yellow-700 dark:text-yellow-300">
                                (diff)
                              </span>
                            )}
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompareWith(isComparing ? null : versionTag);
                              }}
                              className={`p-1 rounded transition-colors ${
                                isComparing
                                  ? "text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              }`}
                              title={isComparing ? "Close diff" : `Compare with ${h.os.version}`}
                            >
                              <GitCompare className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-4">
        <p className="truncate text-muted-foreground" title={path || ""}>
          <code className="text-sm">{path}</code>
        </p>

        {loading && (
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        )}

        {!loading && compareWith && compareLoading && (
          <div className="h-64 bg-muted rounded animate-pulse" />
        )}

        {!loading && compareWith && !compareLoading && compareXml && (
          <DiffViewer
            oldXml={compareXml}
            newXml={xml}
            oldLabel={compareWith}
            newLabel={build}
          />
        )}

        {!loading && !compareWith && xml && (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10 flex gap-1">
              <CopyButton text={xml} />
              <DownloadButton
                content={xml}
                filename={`${path?.split("/").pop() || "entitlements"}.plist`}
              />
            </div>
            <SyntaxHighlighter
              language="xml"
              showLineNumbers={true}
              style={syntaxTheme}
              customStyle={{
                margin: 0,
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                paddingTop: "2.5rem",
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
                            className: ["text-blue-600", "dark:text-blue-300", "hover:underline"],
                            href: withBase(
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
          </div>
        )}

        {!loading && !xml && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No entitlement data found for this binary.</p>
          </div>
        )}
      </main>
    </div>
  );
}
