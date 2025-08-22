export function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
}
