import { dataURL } from "@/lib/env";
import type { OS } from "@/lib/types";
import type { Engine, PathHistory } from "./types";

/**
 * Reads the precomputed JSON records produced by entdb-data's
 * scripts/stages/export_records.py. Every query is one whole-file GET:
 *
 *   {group}/list.json                builds sorted by version (index = ordinal)
 *   {group}/b/{version}_{build}.json {paths, keys: [[key, count]]}
 *   {group}/k/{hash(key)}.json       {key, values, rows: [[path, value, ranges]]}
 *   {group}/p/{hash(path)}.json      {path, plists, runs: [[from, to, plist]]}
 *
 * Ranges are inclusive build ordinals, so one record covers every build.
 */

interface BuildRecord {
  paths: string[];
  keys: [string, number][];
}

interface KeyRecord {
  key: string;
  values: unknown[];
  /** [path, index into values, flat inclusive ranges [from, to, ...]] */
  rows: [string, number, number[]][];
}

interface PathRecord {
  path: string;
  /** Original plist XML, deduplicated. */
  plists: string[];
  /** [from, to, index into plists], inclusive ordinals. */
  runs: [number, number, number][];
}

/**
 * 64-bit FNV-1a of the UTF-8 bytes, as 16 hex digits; must match fnv1a64()
 * in export_records.py. Computed with 16-bit limbs (no BigInt needed):
 * the prime is 2^40 + 435.
 */
export function fnv1a64(text: string): string {
  let h0 = 0x2325;
  let h1 = 0x8422;
  let h2 = 0x9ce4;
  let h3 = 0xcbf2;
  for (const byte of new TextEncoder().encode(text)) {
    h0 ^= byte;
    const t0 = h0 * 435;
    let t1 = h1 * 435;
    let t2 = h2 * 435;
    const t3 = h3 * 435 + (h1 << 8);
    t2 += h0 << 8;
    t1 += t0 >>> 16;
    h0 = t0 & 0xffff;
    t2 += t1 >>> 16;
    h1 = t1 & 0xffff;
    h3 = (t3 + (t2 >>> 16)) & 0xffff;
    h2 = t2 & 0xffff;
  }
  return [h3, h2, h1, h0]
    .map((limb) => limb.toString(16).padStart(4, "0"))
    .join("");
}

function inRanges(ranges: number[], ordinal: number) {
  for (let i = 0; i < ranges.length; i += 2) {
    if (ordinal >= ranges[i] && ordinal <= ranges[i + 1]) return true;
  }
  return false;
}

/** Records are immutable per deploy; share fetches across pages. */
const cache = new Map<string, Promise<unknown>>();

/** Fetch a JSON record; null when it doesn't exist (404). */
function fetchRecord<T>(url: string): Promise<T | null> {
  let pending = cache.get(url) as Promise<T | null> | undefined;
  if (!pending) {
    pending = fetch(url).then((r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
      return r.json() as Promise<T>;
    });
    // Don't cache failures, so a retry can succeed.
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

export class RecordEngine implements Engine {
  #base: string;

  constructor(group: string) {
    this.#base = `${dataURL}/${group}`;
  }

  /** The cached list, in ordinal order. Never hand this array out. */
  private async builds(): Promise<OS[]> {
    const list = await fetchRecord<OS[]>(`${this.#base}/list.json`);
    if (!list) throw new Error(`No builds for ${this.#base}`);
    return list;
  }

  /** A copy: callers may sort it, which must not reorder the ordinals. */
  async listOS(): Promise<OS[]> {
    return [...(await this.builds())];
  }

  /** Accepts a bare build ("23E254") or a tag ("26.4.1_23E254"). */
  private async locate(build: string) {
    const list = await this.builds();
    const ordinal = list.findIndex(
      (o) => o.build === build || `${o.version}_${o.build}` === build,
    );
    if (ordinal === -1) throw new Error(`OS not found for build: ${build}`);
    return { os: list[ordinal], ordinal };
  }

  private async buildRecord(build: string) {
    const { os } = await this.locate(build);
    const record = await fetchRecord<BuildRecord>(
      `${this.#base}/b/${os.version}_${os.build}.json`,
    );
    if (!record) throw new Error(`No data for build ${build}`);
    return record;
  }

  private keyRecord(key: string) {
    return fetchRecord<KeyRecord>(`${this.#base}/k/${fnv1a64(key)}.json`);
  }

  private pathRecord(path: string) {
    return fetchRecord<PathRecord>(`${this.#base}/p/${fnv1a64(path)}.json`);
  }

  async getPaths(build: string): Promise<string[]> {
    return (await this.buildRecord(build)).paths;
  }

  async getKeys(build: string): Promise<string[]> {
    return (await this.buildRecord(build)).keys.map(([key]) => key);
  }

  /** Binaries with `key` in `build`; empty when the key isn't in it. */
  async getPathsForKey(build: string, key: string): Promise<string[]> {
    const [{ ordinal }, record] = await Promise.all([
      this.locate(build),
      this.keyRecord(key),
    ]);
    if (!record) return [];
    return record.rows
      .filter(([, , ranges]) => inRanges(ranges, ordinal))
      .map(([path]) => path);
  }

  async getBinaryXML(build: string, path: string): Promise<string> {
    const [{ ordinal }, record] = await Promise.all([
      this.locate(build),
      this.pathRecord(path),
    ]);
    const run = record?.runs.find(
      ([from, to]) => ordinal >= from && ordinal <= to,
    );
    if (!record || !run) throw new Error(`${path} not found in ${build}`);
    return record.plists[run[2]];
  }

  /** Every build of the group, newest first, with whether `path` exists. */
  async getPathHistory(path: string): Promise<PathHistory[]> {
    const [list, record] = await Promise.all([
      this.builds(),
      this.pathRecord(path),
    ]);
    const runs = record?.runs ?? [];
    return list
      .map((os, ordinal) => ({
        os,
        available: runs.some(([from, to]) => ordinal >= from && ordinal <= to),
      }))
      .reverse();
  }
}
