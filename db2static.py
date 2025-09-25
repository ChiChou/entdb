#!/usr/bin/env -S PYTHONPATH=. uv run --script

import json
from pathlib import Path

from indexer.db import Reader


class KVStore:
    def __init__(self, records_path: Path, data_path: Path):
        self.records_path = records_path
        self.data_file = data_path.open("wb")
        self.cursor = 0

        self.records = []
        self.known_keys = set()

    def add(self, key: str, value: bytes):
        if key in self.known_keys:
            raise ValueError(f"Duplicate key {key}")

        self.records.append((key, self.cursor, len(value)))
        self.data_file.write(value)
        self.cursor += len(value)

    def close(self):
        with self.records_path.open("w") as fp:
            json.dump(self.records, fp, separators=(",", ":"))
        self.data_file.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("db", help="path to database")
    parser.add_argument("output", help="path to output directory")
    args = parser.parse_args()

    output = Path(args.output)
    r = Reader(args.db)
    oslist = []
    for os in r.all_os():
        oslist.append(os)
        build = os["build"]

        subdir = output / f"{os['version']}_{os['build']}"
        subdir.mkdir(parents=True, exist_ok=True)
        print(subdir.name)

        with (subdir / "paths.txt").open("w") as fp:
            for path in r.paths(build):
                fp.write(path)

        with KVStore(subdir / "blobs.index.json", subdir / "blobs.txt") as blobs_store:
            for b in r.binaries(build):
                blob = b["xml"].decode() + b["json"]
                blobs_store.add(b["path"], blob.encode())

        with KVStore(subdir / "keys.index.json", subdir / "keys.txt") as keys_store:
            for key in r.keys(build):
                paths = r.owns_key(build, key)
                keys_store.add(key, "\n".join(paths).encode())

    with (output / 'list.json').open('w') as fp:
        json.dump(oslist, fp)


if __name__ == "__main__":
    main()
