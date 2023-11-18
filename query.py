from sqlite3 import Connection
from typing import Iterator

from entdb.db import connect


def find_by_key(conn: Connection, key: str) -> Iterator[str]:
    sql = '''SELECT bin.path FROM pair, bin WHERE pair.key == ? AND bin.id = pair.binary_id;'''
    for row in conn.execute(sql, [key]):
        path, = row
        yield path


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('db', help='database file', default='data.db', nargs='?')
    args = parser.parse_args()
    conn = connect(args.db)

    print('library validation disabled')
    for path in find_by_key(conn, 'com.apple.security.cs.disable-library-validation'):
        print(path)

    print('allows debug')
    for path in find_by_key(conn, 'com.apple.security.get-task-allow'):
        print(path)

    print('all possible entitlements')
    for row in conn.execute('SELECT DISTINCT key FROM pair ORDER BY key'):
        key, = row
        print(key)

    conn.close()