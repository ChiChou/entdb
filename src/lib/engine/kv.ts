import type { Engine } from "./types";
import type { OS } from "@/lib/types";
import { dataBaseURL } from "@/lib/env";
import { fetchText, fetchLines } from "@/lib/client";

interface KVRecord {
  key: string;
  offset: number;
  length: number;
}

class KVStore {
  #index: Map<string, [number, number]> = new Map();
  #blobsURL: string;

  constructor(records: KVRecord[], blobsURL: string) {
    for (const { key, offset, length } of records) {
      if (this.#index.has(key)) {
        throw new Error(`invalid data source, duplicate key: ${key}`);
      }
      this.#index.set(key, [offset, length]);
    }
    this.#blobsURL = blobsURL;
  }

  async get(key: string): Promise<string> {
    const pair = this.#index.get(key);
    if (!pair) {
      throw new Error(`key not found: ${key}`);
    }
    const [offset, length] = pair;

    return fetch(this.#blobsURL, {
      headers: {
        Range: `bytes=${offset}-${offset + length - 1}`,
      },
    }).then((r) => {
      if (!r.ok) {
        throw new Error(`failed to fetch blob for key: ${key}`);
      }
      return r.text();
    });
  }

  *keys(): IterableIterator<string> {
    yield* this.#index.keys();
  }
}

export class KVEngine implements Engine {
  #baseURL: string;

  constructor(group: string) {
    this.#baseURL = `${dataBaseURL()}/${group}`;
  }

  async listOS(): Promise<OS[]> {
    const list = await fetchText(`${this.#baseURL}/list.json`);
    return JSON.parse(list);
  }

  async getPaths(build: string): Promise<string[]> {
    const os = await this.findOS(build);
    const tag = `${os.version}_${build}`;
    return fetchLines(`${this.#baseURL}/${tag}/paths.txt`);
  }

  async getBinaryXML(build: string, path: string): Promise<string> {
    const os = await this.findOS(build);
    const tag = `${os.version}_${build}`;
    const reader = await this.openKV(`${this.#baseURL}/${tag}/blobs`);
    const blob = await reader.get(path);

    const location = blob.search(/<\/plist>\s*{/i);
    if (location === -1) {
      return blob;
    }
    return blob.substring(0, location + 8);
  }

  async getKeys(build: string): Promise<string[]> {
    const os = await this.findOS(build);
    const tag = `${os.version}_${build}`;
    const reader = await this.openKV(`${this.#baseURL}/${tag}/keys`);
    return [...reader.keys()];
  }

  async getPathsForKey(build: string, key: string): Promise<string[]> {
    const os = await this.findOS(build);
    const tag = `${os.version}_${build}`;
    const reader = await this.openKV(`${this.#baseURL}/${tag}/keys`);
    const lines = await reader.get(key);
    return lines.split("\n").filter(Boolean);
  }

  #osCache: OS[] | null = null;

  private async findOS(build: string): Promise<OS> {
    if (!this.#osCache) {
      this.#osCache = await this.listOS();
    }
    const os = this.#osCache.find((o) => o.build === build);
    if (!os) throw new Error(`OS not found for build: ${build}`);
    return os;
  }

  private async openKV(baseURL: string): Promise<KVStore> {
    const recordsURL = baseURL + ".index.json";
    const blobsURL = baseURL + ".txt";
    const records = await fetch(recordsURL).then((r) => r.json());
    return new KVStore(records, blobsURL);
  }
}
