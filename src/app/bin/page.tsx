"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/breadcrumb-list";
import { CopyButton } from "@/components/copy-button";

import { fetchText } from "@/lib/client";
import { addBasePath } from "@/lib/env";

type leaf = string | number | boolean;

interface Entitlements {
  [key: string]: leaf | Entitlements | leaf[];
}

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
  const [json, setJSON] = useState<Entitlements | null>(null);
  const [xmlKeys, setXMLKeys] = useState<string[]>([]);

  useEffect(() => {
    async function fetchXML() {
      fetchText(addBasePath(`/data/${os}/fs${path}.plist`)).then(setXML);
    }

    async function fetchJSON() {
      fetch(addBasePath(`/data/${os}/fs${path}.json`))
        .then((r) => {
          if (!r.ok && r.status === 404) {
            throw new Error(`file ${path} does not exist`);
          }
          return r;
        })
        .then((r) => r.json())
        .then(setJSON);
    }

    fetchJSON();
    fetchXML();
  }, [os, path]);

  useEffect(() => {
    if (json) {
      const keys = Object.keys(json).sort();
      setXMLKeys(keys);
    } else {
      setXMLKeys([]);
    }
  }, [json]);

  return (
    <div className="p-8">
      <Breadcrumbs os={os}>
        <code className="text-red-800">{path}</code>
      </Breadcrumbs>

      <main className="space-y-6">
        <Tabs defaultValue="xml">
          <TabsList>
            <TabsTrigger value="xml">Content</TabsTrigger>
            <TabsTrigger value="json">Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="xml">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">XML</h2>
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
              lineProps={{
                onClick: (line) => {
                  console.log(line);
                },
              }}
            >
              {xml}
            </SyntaxHighlighter>
          </TabsContent>

          <TabsContent value="json">
            <ul className="grid sm:grid-cols-1 lg:grid-cols-2 gap-2 mt-4">
              {xmlKeys.map((key) => (
                <li key={key}>
                  <Link
                    href={`/find?os=${os}&key=${key}`}
                    className="block p-4 border rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
                  >
                    {key}
                  </Link>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
