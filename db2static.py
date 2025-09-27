#!/usr/bin/env -S PYTHONPATH=. uv run --script

import json
from pathlib import Path

from indexer.db import Reader
from indexer.kv import KVStore


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
            fp.write("\n".join(r.paths(build)))

        with KVStore(subdir / "blobs.index.json", subdir / "blobs.txt") as blobs_store:
            for b in r.binaries(build):
                blob = b["xml"].decode() + b["json"]
                blobs_store.add(b["path"], blob.encode())

        with KVStore(subdir / "keys.index.json", subdir / "keys.txt") as keys_store:
            for key in r.keys(build):
                paths = r.owns_key(build, key)
                keys_store.add(key, "\n".join(paths).encode())

        with open(subdir / 'meta.json', 'w') as fp:
            json.dump(os, fp)

    with (output / "list.json").open("w") as fp:
        json.dump(oslist, fp)


if __name__ == "__main__":
    main()
