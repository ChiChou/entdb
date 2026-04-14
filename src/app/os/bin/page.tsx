"use client";

import { useEffect, useState, useMemo } from "react";
import { redirect, useSearchParams } from "next/navigation";
import {
  createElement,
  Prism as SyntaxHighlighter,
} from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

import { CopyButton } from "@/components/copy-button";
import { DiffViewer } from "@/components/diff-viewer";

import { addBasePath } from "@/lib/env";
import { createEngine } from "@/lib/engine";
import type { PathHistory } from "@/lib/engine/types";
import { normalizePlist } from "@/lib/plist";

export default function BinaryDetail() {
  const params = useSearchParams();
  const os = params.get("os");
  const path = params.get("path");
  const compareWith = params.get("compare");

  const [group, build] = os ? os.split("/") : ["", ""];

  useEffect(() => {
    if (os && path) {
      document.title = `${path} | ${os} - Entitlement Database`;
    }
  });

  if (typeof os !== "string" || typeof path !== "string") {
    redirect("/404");
  }

  const [loading, setLoading] = useState(false);
  const [xml, setXML] = useState<string>("");
  const [xmlKeys, setXMLKeys] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PathHistory[]>([]);
  const [compareXml, setCompareXml] = useState<string>("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string>("");

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
    if (!compareWith || !group) return;

    setCompareError("");
    setCompareXml("");

    async function loadCompare() {
      const engine = await createEngine(group);
      const rawXml = await engine.getBinaryXML(compareWith!, path!);
      const prettified = normalizePlist(rawXml);
      setCompareXml(prettified);
    }

    setCompareLoading(true);
    loadCompare()
      .catch((err) => {
        setCompareError(err.message || "Failed to load comparison");
      })
      .finally(() => setCompareLoading(false));
  }, [group, compareWith, path]);

  const normalizedXml = useMemo(
    () => (xml ? normalizePlist(xml) : ""),
    [xml],
  );
  const normalizedCompareXml = useMemo(
    () => (compareXml ? normalizePlist(compareXml) : ""),
    [compareXml],
  );

  const availableHistory = history.filter((h) => h.available);
  const currentOs = history.find(
    (h) => h.os.build === build || `${h.os.version}_${h.os.build}` === build,
  );

  // Group versions by major version
  const groupedHistory = useMemo(() => {
    const groups: { [major: string]: typeof availableHistory } = {};
    for (const h of availableHistory) {
      const major = h.os.version.split(".")[0];
      if (!groups[major]) groups[major] = [];
      groups[major].push(h);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a));
  }, [availableHistory]);

  const renderVersionLink = (h: typeof availableHistory[0]) => {
    const isCurrent =
      h.os.build === build || `${h.os.version}_${h.os.build}` === build;
    const isComparing = compareWith === `${h.os.version}_${h.os.build}`;
    const versionTag = `${h.os.version}_${h.os.build}`;

    if (isCurrent) {
      return (
        <span
          key={h.os.build}
          className="block px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium"
        >
          {h.os.version} (current)
        </span>
      );
    }

    const href = isComparing
      ? addBasePath(`/os/bin?os=${encodeURIComponent(os!)}&path=${encodeURIComponent(path!)}`)
      : addBasePath(`/os/bin?os=${encodeURIComponent(os!)}&path=${encodeURIComponent(path!)}&compare=${encodeURIComponent(versionTag)}`);

    return (
      <a
        key={h.os.build}
        href={href}
        className={`block px-2 py-1 text-xs rounded transition-colors ${
          isComparing
            ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
            : "hover:bg-accent"
        }`}
      >
        {h.os.version}
        {isComparing && " (comparing)"}
      </a>
    );
  };

  const hasVersionHistory = availableHistory.length > 1;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Entitlements</h2>
            <p className="truncate" title={path || ""}>
              <code className="text-red-800 dark:text-red-400 text-sm">
                {path}
              </code>
            </p>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        )}

        {!loading && compareWith && compareError && (
          <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
            <p className="font-medium">Comparison failed</p>
            <p className="text-sm mt-1">{compareError}</p>
          </div>
        )}

        {!loading && compareWith && !compareLoading && !compareError && normalizedCompareXml && (
          <DiffViewer
            oldXml={normalizedCompareXml}
            newXml={normalizedXml}
            oldLabel={`${compareWith}`}
            newLabel={currentOs ? `${currentOs.os.version}_${currentOs.os.build}` : build}
          />
        )}

        {!loading && !compareWith && xml && (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10">
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
          </div>
        )}

        {compareLoading && (
          <div className="h-64 bg-muted rounded animate-pulse" />
        )}
      </main>

      {/* Version history sidebar */}
      {hasVersionHistory && (
        <aside className="lg:w-48 shrink-0">
          <div className="lg:sticky lg:top-4">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
              History ({availableHistory.length})
            </h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {groupedHistory.map(([major, versions]) => (
                <details
                  key={major}
                  open={versions.some(
                    (h) =>
                      h.os.build === build ||
                      `${h.os.version}_${h.os.build}` === build ||
                      compareWith === `${h.os.version}_${h.os.build}`
                  )}
                  className="group"
                >
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 py-1">
                    <span className="group-open:rotate-90 transition-transform">
                      ▶
                    </span>
                    iOS {major}.x
                    <span className="ml-auto text-muted-foreground/60">
                      {versions.length}
                    </span>
                  </summary>
                  <div className="ml-3 mt-1 space-y-0.5 border-l pl-2">
                    {versions.map(renderVersionLink)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
