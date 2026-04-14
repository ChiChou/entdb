import type { Engine } from "./types";
import { WASMEngine } from "./wasm";
import { checkWASMSupport as checkSQLiteWASMSupport } from "./wasm";
import { KVEngine } from "./kv";

let wasmSupported: boolean | null = null;
const wasmDisabled = process.env.NEXT_PUBLIC_USE_WASM === "0";

async function checkWASMSupport(): Promise<boolean> {
  if (wasmSupported !== null) return wasmSupported;

  wasmSupported = await checkSQLiteWASMSupport();
  return wasmSupported;
}

export async function createEngine(group: string): Promise<Engine> {
  if (wasmDisabled) {
    return new KVEngine(group);
  }

  const supported = await checkWASMSupport();
  if (supported) {
    return new WASMEngine();
  }
  return new KVEngine(group);
}

export { KVEngine, WASMEngine };
