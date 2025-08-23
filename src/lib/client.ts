export async function fetchText(url: string | URL): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Failed to fetch ${url}: ${r.status} ${r.statusText}`);
  }
  return r.text();
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
}

export async function fetchLines(url: string | URL): Promise<string[]> {
  return splitLines(await fetchText(url));
}

export function escapeKey(name: string) {
  const allowedRegex = /[a-zA-Z0-9_.-]/;
  return Array.from(name)
    .map((c) =>
      allowedRegex.test(c)
        ? c
        : `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`,
    )
    .join("");
}
