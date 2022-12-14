import plistlib
import json
from pathlib import Path

from entdb.magic import is_macho
from entdb.db import init, conn
from entdb.finder import PathFinder
from entdb.parser import xml


rule_file = str(Path(__file__).parent / 'paths.txt')
finder = PathFinder(rule_file)


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

        relative = path.relative_to(self.root)

        if finder.is_excluded(str(relative)):
            return

        for child in path.iterdir():
            try:
                yield from self.visit(child)
            except PermissionError:
                return


def main(rootdir: str):
    root = Path(rootdir).resolve()
    with open(root / 'System/Library/CoreServices/SystemVersion.plist', 'rb') as fp:
        info = plistlib.load(fp)
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

        path = '/%s' % item.resolve().relative_to(root)
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
                'INSERT INTO pair(binary_id, key, value) VALUES (?, ?, ?)', (bin_id, key, json.dumps(val))
            )

        conn.commit()


if __name__ == '__main__':
    import logging
    logging.basicConfig(level=logging.INFO)

    init()
    main('/')
