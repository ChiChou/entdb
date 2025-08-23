"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

  if (typeof os !== "string" || typeof path !== "string") {
    redirect("/404");
  }

  const [xml, setXML] = useState<string | "">("");
  const [json, setJSON] = useState<Entitlements | null>(null);
  const [xmlKeys, setXMLKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaths() {
      if (!os || !path) {
        setXML("");
        setError("Missing os or key parameter");
        return;
      }
      setError(null);
      fetchText(`/data/${os}/fs${path}.xml`)
        .then(setXML)
        .catch(() => setError("Failed to fetch xml"));
    }
    fetchPaths();
  }, [os, path]);

  useEffect(() => {
    async function fetchJSON() {
      if (!os || !path) {
        setJSON(null);
        setError("Missing os or key parameter");
        return;
      }
      setError(null);
      fetchText(`/data/${os}/fs${path}.json`)
        .then((text) => {
          try {
            const data = JSON.parse(text);
            setJSON(data);
          } catch (e) {
            setError("Failed to parse json");
          }
        })
        .catch(() => setError("Failed to fetch json"));
    }
    fetchJSON();
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
      <header className="mb-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={addBasePath(`/os?os=${os}`)}>
                {os}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <code className="text-red-800">{path}</code>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

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
