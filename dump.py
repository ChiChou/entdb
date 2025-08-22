from pathlib import Path, PosixPath
from multiprocessing import Pool
import sqlite3
import plistlib
import json
import string

dbs = Path('sqlite')
output = Path('output')
output.mkdir(exist_ok=True)


def escape_key(name: str):
    allowed = string.ascii_letters + string.digits + "_.-"
    return ''.join(c if c in allowed else f'%{ord(c):02x}' for c in name)


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

    search = root / "search"
    search.mkdir(exist_ok=True)

    keys = {}
    rows = cursor.execute('select id, key from entitlement_keys order by key;')
    for row in rows:
        key_id, key = row
        if len(key):
            keys[key_id] = key

    # dump keys
    with (root / "keys").open('w') as fp:
        for key_id in keys:
            key = keys[key_id]

            fp.write(key)
            fp.write('\n')

            with (search / escape_key(key)).open('w') as f2:
                rows = cursor.execute(
                    '''select p.path from paths as p join entitlements as e join entitlement_keys as ek
                        on p.id==e.path_id and e.key_id == ek.id where ek.id=? order by p.path;''', (key_id,))

                for row in rows:
                    path, = row
                    f2.write(path)
                    f2.write('\n')


    for path_id in paths:
        path_str = paths[path_id]

        child = PosixPath(paths[path_id].lstrip('/'))
        xml_file = root / "fs" / child.with_suffix('.xml')
        xml_file.parent.mkdir(parents=True, exist_ok=True)

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

        with xml_file.open('wb') as f:
            plistlib.dump(ent, f, fmt=plistlib.FMT_XML)

        json_file = xml_file.with_suffix('.json')
        with json_file.open('w') as f:
            json.dump(ent, f, indent=4)


def main():
    pool = Pool()
    pool.map(worker, dbs.glob('*.db'))


if __name__ == '__main__':
    main()

    # worker(dbs / '13.0_17A577.db')
