"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Key, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { VersionSwitcher } from "./version-switcher";

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

      <div className="hidden sm:flex">
        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
          <Link
            href={`/os/keys?os=${os}`}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors ${
              currentPage === "keys"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            Entitlement Keys
          </Link>
          <Link
            href={`/os/files?os=${os}`}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors ${
              currentPage === "files"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            Browse Files
          </Link>
        </div>
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

  return (
    <header className="shrink-0 border-b border-border bg-background">
      {/* Desktop: single row */}
      <div className="hidden sm:flex items-center gap-4 px-4 md:px-6 h-14">
        <h1 className="text-xl font-bold shrink-0">
          <Link href="/" className="hover:text-muted-foreground transition-colors">
            entdb
          </Link>
        </h1>

        <div className="flex-1 flex items-center min-w-0">
          {isHome && <HomeControls />}
          {isOSPage && os && <OSBreadcrumb os={os} currentPage={currentPage} />}
        </div>

        <ThemeToggle />
      </div>

      {/* Mobile: two rows when needed */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-lg font-bold">
            <Link href="/" className="hover:text-muted-foreground transition-colors">
              entdb
            </Link>
          </h1>
          <ThemeToggle />
        </div>

        {(isHome || (isOSPage && os)) && (
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
            {isHome && <HomeControls />}
            {isOSPage && os && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">{os.split("/")[0]}</span>
                <VersionSwitcher currentOs={os} />
                <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30 shrink-0">
                  <Link
                    href={`/os/keys?os=${os}`}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      currentPage === "keys"
                        ? "bg-background text-foreground shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Key className="h-3 w-3" />
                    Keys
                  </Link>
                  <Link
                    href={`/os/files?os=${os}`}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      currentPage === "files"
                        ? "bg-background text-foreground shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Folder className="h-3 w-3" />
                    Files
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
