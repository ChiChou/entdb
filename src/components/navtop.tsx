"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Key, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { VersionSwitcher } from "./version-switcher";
import { HEADER_PORTAL_ID } from "./header-portal";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

function OSBreadcrumb({ os, currentPage }: { os: string; currentPage: string }) {
  const [platform] = os.split("/");

  return (
    <div className="flex items-center gap-4 text-sm min-w-0 flex-1">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground">{platform}</span>
        <VersionSwitcher currentOs={os} />
      </div>

      <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
        <Link
          href={`/os/keys?os=${os}`}
          className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${
            currentPage === "keys"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Keys</span>
        </Link>
        <Link
          href={`/os/files?os=${os}`}
          className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${
            currentPage === "files"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Files</span>
        </Link>
      </div>
    </div>
  );
}

function HomeControls() {
  const searchParams = useSearchParams();
  const showAll = searchParams.get("view") === "all";

  return (
    <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
      <Link
        href="/"
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          !showAll
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Major Releases
      </Link>
      <Link
        href="/?view=all"
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          showAll
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        All Builds
      </Link>
    </div>
  );
}

export function NavTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/";
  const isOSPage = pathname.startsWith("/os/");
  const os = searchParams.get("os") || "";

  const currentPage = pathname.includes("/files")
    ? "files"
    : pathname.includes("/bin")
      ? "bin"
      : pathname.includes("/find")
        ? "find"
        : "keys";

  const showHeaderControls = isOSPage && (currentPage === "keys" || currentPage === "files" || currentPage === "find");

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-6 py-3">
        {/* Left group: logo + breadcrumb */}
        <div className="flex items-center gap-4 min-w-0 shrink-0">
          <h1 className="text-xl font-bold shrink-0">
            <Link href="/" className="hover:text-muted-foreground transition-colors">
              entdb
            </Link>
          </h1>
          {isHome && <HomeControls />}
          {isOSPage && os && <OSBreadcrumb os={os} currentPage={currentPage} />}
        </div>

        <div className="hidden sm:block flex-1 min-w-0" />

        {/* Right group: filter + theme */}
        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          {showHeaderControls && (
            <div id={HEADER_PORTAL_ID} className="flex items-center gap-2 flex-1 sm:flex-none" />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
