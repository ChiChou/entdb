"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { VersionSwitcher } from "@/components/version-switcher";

import { addBasePath } from "@/lib/env";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function OSDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const os = params.get("os") || "";

  const currentPage = pathname.includes("/files")
    ? "files"
    : pathname.includes("/bin")
      ? "bin"
      : pathname.includes("/find")
        ? "find"
        : "keys";

  useEffect(() => {
    if (os) document.title = `${os || ""} - Entitlement Database`;
  }, [os]);

  return (
    <div className="p-4 md:p-8" suppressHydrationWarning>
      <header className="mb-6 space-y-3">
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

        <nav className="flex items-center gap-4 text-sm">
          <Link
            href={addBasePath(`/os/keys?os=${os}`)}
            className={currentPage === "keys" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
          >
            Entitlement Keys
          </Link>
          <Link
            href={addBasePath(`/os/files?os=${os}`)}
            className={currentPage === "files" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
          >
            Browse Files
          </Link>
          {currentPage === "find" && (
            <span className="font-medium">Search Results</span>
          )}
          {currentPage === "bin" && (
            <span className="font-medium">Binary Detail</span>
          )}
        </nav>
      </header>

      <div>{children}</div>
    </div>
  );
}
