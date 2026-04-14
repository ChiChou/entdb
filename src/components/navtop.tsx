"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

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
      className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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

export function NavTop() {
  return (
    <header className="flex flex-row justify-between items-center px-4 md:px-8 py-4 w-full border-b border-border bg-background text-foreground">
      <h1 className="text-2xl font-bold">
        <Link href="/" className="hover:text-muted-foreground">
          entdb
        </Link>
      </h1>
      <nav className="flex items-center gap-4 text-sm">
        <a
          href="https://github.com/chichou/entdb-indexer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub
        </a>
        <a
          href="https://infosec.exchange/@codecolorist"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Mastodon
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
