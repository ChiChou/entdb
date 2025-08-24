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
  breadcrumb,
  children,
}: {
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const os = params.get("os");

  useEffect(() => {
    if (os) document.title = `${os || ""} - Entitlement Database`;
  }, [os]);

  return (
    (os && (
      <div>
        <header className="p-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={addBasePath("/")}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={addBasePath(`/os?os=${os}`)}>
                  {os}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumb && <BreadcrumbSeparator />}
              {breadcrumb && (
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumb}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="p-8">{children}</div>
      </div>
    )) || <div className="p-8">Invalid OS param</div>
  );
}
