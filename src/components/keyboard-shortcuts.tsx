"use client";

import { Keyboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HEADER_PORTAL_ID } from "@/components/header-portal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Site-wide shortcuts, mounted once in the header:
 *   /        focus the page filter      Esc   clear it, then leave it
 *   j / k    next / previous item       ?     this help
 *   g h|k|f  go home / keys / files     v     version picker
 *
 * Lists opt in by marking focusable rows with `data-nav-item`. Widgets that
 * own their keys (the namespace tree, file trees) handle them first and call
 * preventDefault, so they win over these.
 */

/** Marks a focusable row that j/k step through. */
export const NAV_ITEM_ATTR = "data-nav-item";

/** Marks the button that opens the version picker. */
export const VERSION_PICKER_ATTR = "data-version-picker";

const GOTO_WINDOW_MS = 1200;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(
    el &&
      (el.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)),
  );
}

function headerFilter() {
  return document.querySelector<HTMLInputElement>(`#${HEADER_PORTAL_ID} input`);
}

/** Clear a React-controlled input the way typing would. */
function clearInput(input: HTMLInputElement) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function visible(el: HTMLElement) {
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

/** Move focus to the next/previous `data-nav-item` in the page content. */
function stepItems(direction: 1 | -1) {
  const items = [
    ...document.querySelectorAll<HTMLElement>(`main [${NAV_ITEM_ATTR}]`),
  ].filter(visible);
  if (items.length === 0) return;

  const current = items.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  if (current !== -1) {
    next = items[current + direction];
  } else {
    // Nothing focused yet: start from what's on screen.
    const onScreen = items.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });
    next = direction === 1 ? onScreen[0] : onScreen.at(-1);
    next ??= items[direction === 1 ? 0 : items.length - 1];
  }
  if (!next) return;
  next.focus();
  next.scrollIntoView({ block: "nearest" });
}

export function KeyboardShortcuts({ os }: { os: string }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let gotoAt = 0;

    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;

      if (isTyping(event.target)) {
        const input = event.target as HTMLInputElement;
        if (event.key === "Escape" && input === headerFilter()) {
          event.preventDefault();
          if (input.value) clearInput(input);
          else input.blur();
        }
        return;
      }

      // "g" then a letter: go to a page.
      if (performance.now() - gotoAt < GOTO_WINDOW_MS) {
        gotoAt = 0;
        const target =
          event.key === "h"
            ? "/"
            : os && event.key === "k"
              ? `/os/keys?os=${encodeURIComponent(os)}`
              : os && event.key === "f"
                ? `/os/files?os=${encodeURIComponent(os)}`
                : null;
        if (target) {
          event.preventDefault();
          router.push(target);
          return;
        }
      }

      switch (event.key) {
        case "/": {
          const input = headerFilter();
          if (!input) return;
          event.preventDefault();
          input.focus();
          input.select();
          return;
        }
        case "?":
          event.preventDefault();
          setHelpOpen(true);
          return;
        case "j":
        case "k":
          event.preventDefault();
          stepItems(event.key === "j" ? 1 : -1);
          return;
        case "g":
          gotoAt = performance.now();
          return;
        case "v": {
          const picker = document.querySelector<HTMLElement>(
            `[${VERSION_PICKER_ATTR}]`,
          );
          if (!picker) return;
          event.preventDefault();
          picker.click();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [os, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="hidden shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:block"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="h-4 w-4" />
      </button>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Available everywhere unless you&apos;re typing in a field.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 text-sm sm:grid-cols-2">
            {SHORTCUTS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                <dl className="space-y-1.5">
                  {group.items.map(([keys, label]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="flex shrink-0 gap-1">
                        {keys.map((key) => (
                          <kbd
                            key={key}
                            className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const SHORTCUTS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Anywhere",
    items: [
      [["/"], "Filter"],
      [["Esc"], "Clear / leave filter"],
      [["v"], "Switch version"],
      [["?"], "Show shortcuts"],
    ],
  },
  {
    title: "Go to",
    items: [
      [["g", "h"], "Home"],
      [["g", "k"], "Keys"],
      [["g", "f"], "Files"],
    ],
  },
  {
    title: "Lists",
    items: [
      [["j"], "Next item"],
      [["k"], "Previous item"],
      [["Enter"], "Open"],
      [["⌘", "C"], "Copy focused key"],
    ],
  },
  {
    title: "Trees",
    items: [
      [["↑", "↓"], "Move"],
      [["→"], "Expand / go in"],
      [["←"], "Collapse / go up"],
      [["a–z"], "Jump to name (keys)"],
    ],
  },
];
