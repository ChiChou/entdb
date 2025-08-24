class KV {
  #index: Map<string, [number, number]> = new Map();
  #blobs: string;

  constructor(records: [[string, number, number]], blobs: string) {
    for (const [key, offset, length] of records) {
      if (this.#index.has(key)) {
        throw new Error(`invalid data source, duplicate key: ${key}`);
      }
      this.#index.set(key, [offset, length]);
    }
    this.#blobs = blobs;
  }

  async get(key: string): Promise<string> {
    const pair = this.#index.get(key);
    if (!pair) {
      throw new Error(`key not found: ${key}`);
    }
    const [offset, length] = pair;

    // fetch using Range request
    return fetch(this.#blobs, {
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

export async function create(baseURL: string) {
  const recordsURL = baseURL + "-index.json";
  const blobsURL = baseURL + ".bin";
  const records = await fetch(recordsURL).then((r) => r.json());
  return new KV(records, blobsURL);
}

export type Reader = KV;
