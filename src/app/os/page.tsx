"use client";

import { useEffect } from "react";
import { useSearchParams, redirect } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Keys from "@/components/keys";
import Paths from "@/components/paths";
import { Breadcrumbs } from "@/components/breadcrumb-list";

export default function OSDetail() {
  const params = useSearchParams();
  const os = params.get("os");
  const tab = params.get("path") || "keys";

  useEffect(() => {
    document.title = os || "Entitlement Database";
  }, [os]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  if (typeof os !== "string") {
    return <div className="p-8">Invalid OS</div>;
  }

  if (tab !== "keys" && tab !== "files") {
    return redirect(`/os?os=${os}&tab=keys`);
  }

  return (
    <div className="p-8">
      <Breadcrumbs os={os}></Breadcrumbs>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="keys">Keys</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="keys">
          <Keys />
        </TabsContent>
        <TabsContent value="files">
          <Paths />
        </TabsContent>
      </Tabs>
    </div>
  );
}
