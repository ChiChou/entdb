import type { OS } from "@/lib/types";

/** URL tag for a build, e.g. `27.2.1_24B91034`. */
export function versionTag(os: OS) {
  return `${os.version}_${os.build}`;
}

/** Whether `os` is the build named by `tag` (a bare build or a full tag). */
export function matchesVersion(os: OS, tag: string) {
  return os.build === tag || versionTag(os) === tag;
}

/** Sort comparator: newest version first, then by build. */
export function compareOSVersion(a: OS, b: OS) {
  const vA = a.version.split(".").map(Number);
  const vB = b.version.split(".").map(Number);
  for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
    const diff = (vB[i] || 0) - (vA[i] || 0);
    if (diff !== 0) return diff;
  }

  return b.build.localeCompare(a.build);
}
