from pathlib import Path
from multiprocessing import Pool
import sqlite3
import plistlib
import json

from kv import KVStore


def worker(args: tuple[Path, Path]):
    dbfile, output = args

    db = sqlite3.connect(str(dbfile))

    root = (output / dbfile.name).with_suffix("")
    root.mkdir(exist_ok=True)

    cursor = db.cursor()
    cursor.execute("select id, path from paths order by path;")
    paths = {}
    path_list = []

    for row in cursor:
        path_id, path_str = row
        paths[path_id] = path_str
        path_list.append(path_str)

    # dump paths
    with (root / "paths.txt").open("w") as fp:
        fp.write("\n".join(path_list))

    keys = {}
    rows = cursor.execute("select id, key from entitlement_keys order by key;")
    for row in rows:
        key_id, key = row
        if len(key):
            keys[key_id] = key

    # dump keys
    with KVStore(root / "keys.index.json", root / "keys.txt") as kv_keys:
        for key_id in keys:
            key = keys[key_id]

            rows = cursor.execute(
                """select p.path from paths as p join entitlements as e join entitlement_keys as ek
                    on p.id==e.path_id and e.key_id == ek.id where ek.id=? order by p.path;""",
                (key_id,),
            )

            files = [row[0] for row in rows]
            blob = "\n".join(files).encode("utf-8")
            kv_keys.add(key, blob)

    with KVStore(root / "blobs.index.json", root / "blobs.txt") as kv_blobs:
        for path_id in paths:
            path_str = paths[path_id]
            rows = cursor.execute(
                """select ek.key, ev.value, ev.value_type from entitlements as ent
                join entitlement_keys as ek on ent.key_id == ek.id
                join entitlement_values as ev on ent.value_id == ev.id
                where ent.path_id == ?;""",
                (path_id,),
            )

            ent = {}
            for row in rows:
                key, value, value_type = row
                match value_type:
                    case "bool":
                        ent[key] = bool(value)
                    case "string":
                        ent[key] = value
                    case "array", "dict":
                        ent[key] = json.loads(value)

            xml_blob = plistlib.dumps(ent, fmt=plistlib.FMT_XML)
            json_blob = json.dumps(ent, separators=(",", ":")).encode("utf-8")
            kv_blobs.add(path_str, xml_blob + json_blob)


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "databases", nargs="+", help="list of entitlement databases from ipsw"
    )
    parser.add_argument("-o", "--output", help="output directory")

    args = parser.parse_args()

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    with Pool() as pool:
        pool.map(worker, [(Path(db), output) for db in args.databases])


if __name__ == "__main__":
    main()
