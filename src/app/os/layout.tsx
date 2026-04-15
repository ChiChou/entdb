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

import { withBase } from "@/lib/env";
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
  const binaryPath = params.get("path") || "";
  const binaryName = binaryPath ? binaryPath.split("/").pop() : "";

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
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6" suppressHydrationWarning>
      <header className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 shrink-0">
        <div className="flex items-center">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={withBase("/")}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{os?.split("/")[0]}</span>
                  <VersionSwitcher currentOs={os} />
                </div>
              </BreadcrumbItem>
              {currentPage === "bin" && binaryName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <span className="text-foreground font-medium">
                      {binaryName}
                    </span>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <nav className="flex items-center gap-4 text-sm sm:ml-auto">
          <Link
            href={`/os/keys?os=${os}`}
            className={currentPage === "keys" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
          >
            Entitlement Keys
          </Link>
          <Link
            href={`/os/files?os=${os}`}
            className={currentPage === "files" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
          >
            Browse Files
          </Link>
        </nav>
      </header>

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
