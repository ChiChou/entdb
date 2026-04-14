import type { Engine } from "./types";
import type { OS } from "@/lib/types";
import { dataBaseURL } from "@/lib/env";

type SQLite3Database = {
  exec: (options: {
    sql: string;
    bind?: unknown[];
    rowMode: "array";
    returnValue: "resultRows";
  }) => unknown[][];
  close: () => void;
};

type SQLite3API = {
  oo1: {
    DB: new (filename?: string, flags?: string, vfs?: string) => SQLite3Database;
  };
  capi: {
    sqlite3_js_posix_create_file: (
      filename: string,
      data: Uint8Array | ArrayBuffer,
      dataLen?: number
    ) => void;
  };
};

let sqlite3Module: SQLite3API | null = null;
let dbInstance: SQLite3Database | null = null;
let dbReady = false;

const RANGE_CHUNK_SIZE = 8 * 1024 * 1024;
const RANGE_CONCURRENCY = 6;

async function loadSQLite(): Promise<SQLite3API> {
  if (sqlite3Module) return sqlite3Module;

  const sqliteModule = await import("@sqlite.org/sqlite-wasm");
  const initSQLite = sqliteModule.default;
  sqlite3Module = (await initSQLite()) as unknown as SQLite3API;
  return sqlite3Module;
}

export async function checkWASMSupport(): Promise<boolean> {
  try {
    if (typeof WebAssembly === "undefined") {
      return false;
    }

    await WebAssembly.instantiate(
      Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
    );
    await loadSQLite();
    return true;
  } catch {
    return false;
  }
}

async function fetchRangeChunk(
  url: string,
  start: number,
  end: number
): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: {
      Range: `bytes=${start}-${end}`,
    },
  });

  if (res.status !== 206) {
    throw new Error(`Range request not honored: ${res.status}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

async function fetchDatabaseBytes(url: string): Promise<Uint8Array> {
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) {
    throw new Error(
      `Failed to fetch SQLite database: ${head.status} ${head.statusText}`
    );
  }

  const contentLengthRaw = head.headers.get("content-length");
  const contentLength = contentLengthRaw ? Number(contentLengthRaw) : Number.NaN;
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new Error("Missing or invalid Content-Length header");
  }

  const out = new Uint8Array(contentLength);
  const ranges: Array<[number, number]> = [];
  for (let start = 0; start < contentLength; start += RANGE_CHUNK_SIZE) {
    const end = Math.min(start + RANGE_CHUNK_SIZE - 1, contentLength - 1);
    ranges.push([start, end]);
  }

  let next = 0;
  const workers = Array.from(
    { length: Math.min(RANGE_CONCURRENCY, ranges.length || 1) },
    async () => {
      while (next < ranges.length) {
        const idx = next;
        next += 1;

        const [start, end] = ranges[idx];
        const chunk = await fetchRangeChunk(url, start, end);
        out.set(chunk, start);
      }
    }
  );

  await Promise.all(workers);
  return out;
}

async function getDB(): Promise<SQLite3Database> {
  if (dbReady && dbInstance) return dbInstance;

  const sqlite3 = await loadSQLite();

  const bytes = await fetchDatabaseBytes(`${dataBaseURL()}/ent.db`);
  const filename = "/ent.db";

  try {
    sqlite3.capi.sqlite3_js_posix_create_file(filename, bytes, bytes.byteLength);
  } catch {
    // Ignore duplicate file creation in hot-reload or repeated initialization cases.
  }

  dbInstance = new sqlite3.oo1.DB(filename, "r");
  dbReady = true;
  return dbInstance;
}

export class WASMEngine implements Engine {
  async listOS(): Promise<OS[]> {
    const db = await getDB();
    const rows = db.exec({
      sql: "SELECT name, version, build, devices FROM os ORDER BY version DESC",
      rowMode: "array",
      returnValue: "resultRows",
    });

    return rows.map((row) => ({
      name: row[0] as string,
      version: row[1] as string,
      build: row[2] as string,
      devices: JSON.parse(row[3] as string),
    }));
  }

  async getPaths(build: string): Promise<string[]> {
    const db = await getDB();
    const rows = db.exec({
      sql: `SELECT path FROM bin JOIN os ON bin.osid=os.id WHERE os.build=?`,
      bind: [build],
      rowMode: "array",
      returnValue: "resultRows",
    });
    return rows.map((row) => row[0] as string);
  }

  async getBinaryXML(build: string, path: string): Promise<string> {
    const db = await getDB();
    const rows = db.exec({
      sql: `SELECT xml FROM bin JOIN os ON bin.osid=os.id WHERE os.build=? AND bin.path=?`,
      bind: [build, path],
      rowMode: "array",
      returnValue: "resultRows",
    });
    if (!rows.length) {
      throw new Error(`Binary not found: ${path}`);
    }
    return rows[0][0] as string;
  }

  async getKeys(build: string): Promise<string[]> {
    const db = await getDB();
    const rows = db.exec({
      sql: `SELECT DISTINCT key FROM pair JOIN bin ON pair.binid=bin.id JOIN os ON bin.osid=os.id WHERE os.build=?`,
      bind: [build],
      rowMode: "array",
      returnValue: "resultRows",
    });
    return rows.map((row) => row[0] as string);
  }

  async getPathsForKey(build: string, key: string): Promise<string[]> {
    const db = await getDB();
    const rows = db.exec({
      sql: `SELECT path FROM bin JOIN pair ON bin.id=pair.binid JOIN os ON bin.osid=os.id WHERE os.build=? AND pair.key=?`,
      bind: [build, key],
      rowMode: "array",
      returnValue: "resultRows",
    });
    return rows.map((row) => row[0] as string);
  }
}
