/**
 * Continuity between the keys page and a key's find page:
 * - remember where on the keys page the user clicked a key, so the find page
 *   can offer a precise way back (same namespace, filter, comparison, scroll);
 * - morph the clicked key name into the find page title with a view
 *   transition where the browser supports it.
 */

const RETURN_KEY = "entdb:keys-return";

/** `view-transition-name` shared by the clicked key and the find page title. */
export const KEY_TRANSITION_NAME = "entitlement-key";

export interface KeysReturn {
  /** Keys page URL (path + query, without basePath) to return to. */
  url: string;
  /** The find page this return belongs to. */
  key: string;
  os: string;
  /** Scroll position on the keys page when the key was clicked. */
  scrollY: number;
}

export function rememberKeysPage(entry: KeysReturn) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable: the find page falls back to the key's namespace.
  }
}

const RESTORE_KEY = "entdb:keys-restore";

/**
 * Ask the keys page to restore its scroll once its data has loaded. The
 * browser's own restoration runs before the async load, against a page that
 * is still a short skeleton.
 */
export function requestScrollRestore(entry: KeysReturn) {
  try {
    sessionStorage.setItem(
      RESTORE_KEY,
      JSON.stringify({ url: entry.url, scrollY: entry.scrollY }),
    );
  } catch {
    // Not critical.
  }
}

/** One-shot: the scroll position to restore for `url`, if any. */
export function takeScrollRestore(url: string): number | null {
  try {
    const raw = sessionStorage.getItem(RESTORE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RESTORE_KEY);
    const entry = JSON.parse(raw) as { url: string; scrollY: number };
    return entry.url === url ? entry.scrollY : null;
  } catch {
    return null;
  }
}

/** The remembered keys page, if it led to this exact find page. */
export function keysPageFor(key: string, os: string): KeysReturn | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as KeysReturn;
    return entry.key === key && entry.os === os ? entry : null;
  } catch {
    return null;
  }
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => unknown;
};

/** Whether a click should animate (plain left click, motion allowed). */
export function canAnimateNavigation(event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    typeof (document as ViewTransitionDocument).startViewTransition ===
      "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Navigate inside a view transition. The transition snapshots the new state
 * once `selector` exists (the destination's title), or after `timeoutMs` so a
 * slow route never freezes the page.
 */
export function navigateWithTransition(
  navigate: () => void,
  selector: string,
  timeoutMs = 800,
) {
  const start = (document as ViewTransitionDocument).startViewTransition;
  if (!start) {
    navigate();
    return;
  }
  start.call(document, async () => {
    navigate();
    const deadline = performance.now() + timeoutMs;
    // Poll with timers: rendering (and so requestAnimationFrame) is paused
    // while a view transition's update callback is pending.
    while (!document.querySelector(selector) && performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  });
}
