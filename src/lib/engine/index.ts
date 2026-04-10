import type { Engine } from "./types";
import { WASMEngine } from "./wasm";
import { KVEngine } from "./kv";

let wasmSupported: boolean | null = null;

async function checkWASMSupport(): Promise<boolean> {
  if (wasmSupported !== null) return wasmSupported;

  try {
    if (typeof WebAssembly === "undefined") {
      wasmSupported = false;
      return false;
    }

    await WebAssembly.instantiate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

    await import("@sqlite.org/sqlite-wasm");

    wasmSupported = true;
    return true;
  } catch {
    wasmSupported = false;
    return false;
  }
}

export async function createEngine(group: string): Promise<Engine> {
  const supported = await checkWASMSupport();
  if (supported) {
    return new WASMEngine();
  }
  return new KVEngine(group);
}

export { KVEngine, WASMEngine };
