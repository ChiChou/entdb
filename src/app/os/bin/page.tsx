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

  return (
    <div>
      <main className="space-y-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold">Entitlements of</h2>
            <p>
              <code className="text-red-800 dark:text-red-400 break-all font-thin text-sm">
                {path}
              </code>
            </p>
          </div>
          {!loading && xml && <CopyButton text={xml} />}
        </div>

        {availableHistory.length > 1 && (
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold mb-2">Version History</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              This binary exists in {availableHistory.length} OS versions.
              Select a version to compare:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableHistory.map((h) => {
                const isCurrent =
                  h.os.build === build ||
                  `${h.os.version}_${h.os.build}` === build;
                const isComparing = compareWith === `${h.os.version}_${h.os.build}`;
                const versionTag = `${h.os.version}_${h.os.build}`;

                if (isCurrent) {
                  return (
                    <span
                      key={h.os.build}
                      className="px-2 py-1 text-sm rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium"
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
                    className={`px-2 py-1 text-sm rounded transition-colors ${
                      isComparing
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                        : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {h.os.version}
                    {isComparing && " (comparing)"}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {loading && <p>Loading...</p>}

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
        )}

        {compareLoading && <p>Loading comparison...</p>}
      </main>
    </div>
  );
}
