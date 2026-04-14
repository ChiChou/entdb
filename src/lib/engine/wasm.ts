import type { Engine } from "./types";
import type { OS } from "@/lib/types";
import { dataBaseURL } from "@/lib/env";

type SQLite3API = {
  Database: new (data: ArrayLike<number | bigint>) => {
    exec: (
      sql: string,
      bind?: unknown[]
    ) => {
      columns: string[];
      rows: unknown[][];
    }[];
    close: () => void;
  };
};

let sqlite3Module: SQLite3API | null = null;
let dbInstance: InstanceType<SQLite3API["Database"]> | null = null;
let dbReady = false;

async function loadSQLite(): Promise<SQLite3API> {
  if (sqlite3Module) return sqlite3Module;

  const sqliteModule = await import("@sqlite.org/sqlite-wasm");
  sqlite3Module = (sqliteModule.default || sqliteModule) as unknown as SQLite3API;
  return sqlite3Module;
}

async function getDB(): Promise<InstanceType<SQLite3API["Database"]>> {
  if (dbReady && dbInstance) return dbInstance;

  const sqlite3 = await loadSQLite();

  const response = await fetch(`${dataBaseURL()}/ent.db`);
  const buffer = await response.arrayBuffer();

  dbInstance = new sqlite3.Database(new Uint8Array(buffer));
  dbReady = true;
  return dbInstance;
}

export class WASMEngine implements Engine {
  async listOS(): Promise<OS[]> {
    const db = await getDB();
    const results = db.exec(
      "SELECT name, version, build, devices FROM os ORDER BY version DESC"
    );
    if (!results.length) return [];

    const cols = results[0].columns;
    const nameIdx = cols.indexOf("name");
    const versionIdx = cols.indexOf("version");
    const buildIdx = cols.indexOf("build");
    const devicesIdx = cols.indexOf("devices");

    return results[0].rows.map((row) => ({
      name: row[nameIdx] as string,
      version: row[versionIdx] as string,
      build: row[buildIdx] as string,
      devices: JSON.parse(row[devicesIdx] as string),
    }));
  }

  async getPaths(build: string): Promise<string[]> {
    const db = await getDB();
    const results = db.exec(
      `SELECT path FROM bin JOIN os ON bin.osid=os.id WHERE os.build=?`,
      [build]
    );
    if (!results.length) return [];
    return results[0].rows.map((row) => row[0] as string);
  }

  async getBinaryXML(build: string, path: string): Promise<string> {
    const db = await getDB();
    const results = db.exec(
      `SELECT xml FROM bin JOIN os ON bin.osid=os.id WHERE os.build=? AND bin.path=?`,
      [build, path]
    );
    if (!results.length || !results[0].rows.length) {
      throw new Error(`Binary not found: ${path}`);
    }
    return results[0].rows[0][0] as string;
  }

  async getKeys(build: string): Promise<string[]> {
    const db = await getDB();
    const results = db.exec(
      `SELECT DISTINCT key FROM pair JOIN bin ON pair.binid=bin.id JOIN os ON bin.osid=os.id WHERE os.build=?`,
      [build]
    );
    if (!results.length) return [];
    return results[0].rows.map((row) => row[0] as string);
  }

  async getPathsForKey(build: string, key: string): Promise<string[]> {
    const db = await getDB();
    const results = db.exec(
      `SELECT path FROM bin JOIN pair ON bin.id=pair.binid JOIN os ON bin.osid=os.id WHERE os.build=? AND pair.key=?`,
      [build, key]
    );
    if (!results.length) return [];
    return results[0].rows.map((row) => row[0] as string);
  }
}
