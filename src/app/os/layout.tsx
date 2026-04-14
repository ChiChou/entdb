"use client";

import { useSearchParams } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VersionSwitcher } from "@/components/version-switcher";

import { addBasePath } from "@/lib/env";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function OSDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const os = params.get("os") || "";

  const currentTab = pathname.includes("/files")
    ? "files"
    : pathname.includes("/bin")
      ? "bin"
      : pathname.includes("/find")
        ? "find"
        : "keys";

  useEffect(() => {
    if (os) document.title = `${os || ""} - Entitlement Database`;
  }, [os]);

  const handleTabChange = (tab: string) => {
    if (tab === "bin") return;
    router.push(addBasePath(`/os/${tab}?os=${os}`));
  };

  return (
    <div className="p-4 md:p-8" suppressHydrationWarning>
      <header className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={addBasePath("/")}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="text-muted-foreground">
                  {os?.split("/")[0]}
                </span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <VersionSwitcher currentOs={os} />
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="keys">Entitlement Keys</TabsTrigger>
            <TabsTrigger value="files">Browse Files</TabsTrigger>
            {currentTab === "find" && (
              <TabsTrigger value="find">Search Results</TabsTrigger>
            )}
            {currentTab === "bin" && (
              <TabsTrigger value="bin">Binary Detail</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </header>

      <div>{children}</div>
    </div>
  );
}
