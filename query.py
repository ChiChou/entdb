from entdb.db import conn


def find_by_key(key):
    sql = '''SELECT bin.path FROM pair, bin WHERE pair.key == ? AND bin.id = pair.binary_id;'''
    for row in conn.execute(sql, [key]):
        path, = row
        yield path


if __name__ == '__main__':
    print('library validation disabled')
    for path in find_by_key('com.apple.security.cs.disable-library-validation'):
        print(path)

    print('allows debug')
    for path in find_by_key('com.apple.security.get-task-allow'):
        print(path)

    print('all possible entitlements')
    for row in conn.execute('SELECT DISTINCT key FROM pair ORDER BY key'):
        key, = row
        print(key)
