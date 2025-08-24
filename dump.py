from pathlib import Path
from multiprocessing import Pool
import sqlite3
import plistlib
import json

dbs = Path('sqlite')
output = Path('output')
output.mkdir(exist_ok=True)


class KVStore:
    def __init__(self, records_path: Path, data_path: Path):
        self.records_path = records_path
        self.data_file = data_path.open('wb')
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
        with self.records_path.open('w') as fp:
            json.dump(self.records, fp, separators=(',', ':'))
        self.data_file.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


def worker(dbfile: Path):
    db = sqlite3.connect(str(dbfile))

    root = (output / dbfile.name).with_suffix('')
    root.mkdir(exist_ok=True)

    cursor = db.cursor()
    cursor.execute('select id, path from paths order by path;')
    paths = {}
    path_list = []

    for row in cursor:
        path_id, path_str = row
        paths[path_id] = path_str
        path_list.append(path_str)

    # dump paths
    with (root / "paths").open('w') as fp:
        fp.write('\n'.join(path_list))

    keys = {}
    rows = cursor.execute('select id, key from entitlement_keys order by key;')
    for row in rows:
        key_id, key = row
        if len(key):
            keys[key_id] = key

    # dump keys
    with KVStore(root / "keys-index.json", root / "keys.bin") as kv_keys:
        for key_id in keys:
            key = keys[key_id]

            rows = cursor.execute(
                '''select p.path from paths as p join entitlements as e join entitlement_keys as ek
                    on p.id==e.path_id and e.key_id == ek.id where ek.id=? order by p.path;''', (key_id,))

            files = [row[0] for row in rows]
            blob = '\n'.join(files).encode('utf-8')
            kv_keys.add(key, blob)


    with KVStore(root / "blobs-index.json", root / "blobs.bin") as kv_blobs:
        for path_id in paths:
            path_str = paths[path_id]
            rows = cursor.execute(
                '''select ek.key, ev.value, ev.value_type from entitlements as ent
                join entitlement_keys as ek on ent.key_id == ek.id
                join entitlement_values as ev on ent.value_id == ev.id
                where ent.path_id == ?;''', (path_id,))

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
            json_blob = json.dumps(ent, separators=(',', ':')).encode('utf-8')
            kv_blobs.add(path_str, xml_blob + json_blob)


def main():
    with Pool() as pool:
        pool.map(worker, dbs.glob('*.db'))


if __name__ == '__main__':
    main()

    # worker(dbs / '13.0_17A577.db')
