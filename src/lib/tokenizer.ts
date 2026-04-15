export function tokenizeKeys(keys: string[]): Map<string, number> {
  const freq = new Map<string, number>();

  for (const key of keys) {
    // Split by dots, dashes, underscores
    const parts = key.split(/[.\-_]/);

    for (const part of parts) {
      // Further split camelCase: "AppBundles" -> ["App", "Bundles"]
      const camelParts = part.split(/(?=[A-Z])/).filter((p) => p.length > 0);

      for (const token of camelParts) {
        const lower = token.toLowerCase();
        // Skip very short or numeric tokens
        if (lower.length < 3 || /^\d+$/.test(lower)) continue;
        freq.set(lower, (freq.get(lower) || 0) + 1);
      }
    }
  }

  return freq;
}

export function getTopTokens(
  freq: Map<string, number>,
  limit = 20,
  minCount = 5
): Array<{ token: string; count: number }> {
  return Array.from(freq.entries())
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token, count]) => ({ token, count }));
}
