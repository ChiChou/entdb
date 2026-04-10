import type { OS } from "@/lib/types";

export interface Engine {
  listOS(): Promise<OS[]>;
  getPaths(build: string): Promise<string[]>;
  getBinaryXML(build: string, path: string): Promise<string>;
  getKeys(build: string): Promise<string[]>;
  getPathsForKey(build: string, key: string): Promise<string[]>;
}
