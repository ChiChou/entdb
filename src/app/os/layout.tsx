"use client";

import { useSearchParams } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { addBasePath } from "@/lib/env";
import { useEffect } from "react";

export default function OSDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const os = params.get("os");

  useEffect(() => {
    if (os) document.title = `${os || ""} - Entitlement Database`;
  }, [os]);

  return (
    <div className="p-8" suppressHydrationWarning>
      <header className="mb-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={addBasePath("/")}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={addBasePath(`/os/keys?os=${os}`)}>
                {os}
              </BreadcrumbLink>
              |
              <BreadcrumbLink href={addBasePath(`/os/keys?os=${os}`)}>
                Search Keys
              </BreadcrumbLink>
              |
              <BreadcrumbLink href={addBasePath(`/os/files?os=${os}`)}>
                Search Paths
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div>{children}</div>
    </div>
  );
}
