import { RecordEngine } from "./records";
import type { Engine } from "./types";

export async function createEngine(group: string): Promise<Engine> {
  return new RecordEngine(group);
}

export { RecordEngine };
