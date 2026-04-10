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
import { createEngine } from "@/lib/engine";

function prettifyXml(src: string) {
  const xmlDoc = new DOMParser().parseFromString(src, "application/xml");
  const xsltDoc = new DOMParser().parseFromString(
    `<xsl:stylesheet version="1.0"
     xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
     <xsl:output omit-xml-declaration="yes" indent="yes"/>
        <xsl:template match="node()|@*">
          <xsl:copy>
            <xsl:apply-templates select="node()|@*"/>
          </xsl:copy>
        </xsl:template>
    </xsl:stylesheet>`,
    "application/xml",
  );

  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);
  const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
  const resultXml = new XMLSerializer().serializeToString(resultDoc);
  return resultXml;
}

export default function BinaryDetail() {
  const params = useSearchParams();
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

  const [loading, setLoading] = useState(false);
  const [xml, setXML] = useState<string>("");
  const [xmlKeys, setXMLKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const engine = await createEngine(group);
      const rawXml = await engine.getBinaryXML(build, path!);

      try {
        const prettified = prettifyXml(rawXml);
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
    }

    setLoading(true);
    load().finally(() => setLoading(false));
  }, [group, build, path]);

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
          {!loading && xml && <CopyButton text={xml} />}
        </div>

        {loading && <p>Loading...</p>}
        {!loading && xml && (
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
      </main>
    </div>
  );
}
