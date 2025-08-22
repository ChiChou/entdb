import fs from "fs";

import { OS } from "./types";
import path from "path";

export async function fetchAllOS(): Promise<OS[]> {
  const __dirname = new URL(import.meta.url).pathname;
  const parent = path.join(__dirname, "..", "..", "..", "public", "data");
  const list = await fs.promises.readdir(parent);

  const futures = await Promise.all(
    list.map((item) =>
      fs.promises
        .access(path.join(parent, item, "keys"), fs.constants.F_OK)
        .then(() => item)
        .catch(() => null),
    ),
  );

  const folders = futures.filter((name) => name !== null);
  return folders.map((l) => {
    const [version, build] = l.split("_");
    return { id: `${version}_${build}`, version, build };
  });
}
