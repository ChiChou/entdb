import type { Engine } from "./types";
import { KVEngine } from "./kv";

export async function createEngine(group: string): Promise<Engine> {
  return new KVEngine(group);
}

export { KVEngine };
