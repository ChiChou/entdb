import plistlib
import json
from pathlib import Path

from entdb.magic import is_macho
from entdb.db import connect, init
from entdb.finder import PathFinder
from entdb.parser import xml


class Visitor:
    def __init__(self, finder: PathFinder, root='/'):
        self.finder = finder
        self.root = Path(root).resolve()

    def run(self):
        for item in self.finder.entries():
            yield from self.visit(self.root / item)

    def visit(self, path: Path):
        if not path.exists():
            return

        path = path.resolve()

        if path.is_file():
            if is_macho(path):
                yield path
            return

        if not path.is_dir():
            return

        try:
            relative = path.relative_to(self.root)
        except ValueError:
            return

        if self.finder.is_excluded(str(relative)):
            return

        for child in path.iterdir():
            try:
                yield from self.visit(child)
            except PermissionError:
                continue


def main(root: Path, db: str):
    conn = connect(db)

    with open(root / 'System/Library/CoreServices/SystemVersion.plist', 'rb') as fp:
        info = plistlib.load(fp)

        product = info['ProductName']
        if product == 'iPhone OS':
            rule_file = 'iPhoneOS.txt'
        else:
            rule_file = 'macOS.txt'
            if product != 'macOS':
                logging.warning('unknown product name: %s', product)

        finder = PathFinder(Path(__file__).parent / 'rules' / rule_file)

        name = info['ProductName']
        build = info['ProductBuildVersion']
        ver = info['ProductVersion']
        cur = conn.execute(
            'INSERT INTO os(name, ver, build, path) values(?, ?, ?, ?)', (name, ver, build, str(root)))
        os_id = cur.lastrowid

    conn.commit()

    v = Visitor(finder, str(root))
    known = set()
    for item in v.run():
        if not is_macho(item):
            continue

        try:
            path = '/%s' % item.resolve().relative_to(root)
        except ValueError:
            continue

        if path in known:
            continue

        known.add(path)

        x = xml(str(item))
        if len(x):
            d = plistlib.loads(x)
            j = json.dumps(d)
        else:
            d = {}
            j = ''

        cur = conn.execute(
            'INSERT INTO bin(os_id, path, xml, json) VALUES (?, ?, ?, ?)', (os_id, path, x, j))
        bin_id = cur.lastrowid

        for key, val in d.items():
            conn.execute(
                'INSERT INTO pair(binary_id, key, value) VALUES (?, ?, ?)', (bin_id, key, json.dumps(
                    val))
            )

        conn.commit()

    conn.close()


if __name__ == '__main__':
    import logging
    logging.basicConfig(level=logging.INFO)

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('root', help='root directory', default='/')
    parser.add_argument('database', help='database file',
                        default='data.db', nargs='?')
    parser.add_argument('--init', action='store_true',
                        help='initialize database')

    args = parser.parse_args()
    root = Path(args.root).resolve()

    if args.init:
        init(args.database)

    main(root, args.database)
