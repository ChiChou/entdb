import json
import re

from entdb.db import connect


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('db', nargs='?', default='data.db', help='database file')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--ents', action='store_true', help='list entitlements')
    group.add_argument('--bins', action='store_true', help='list binaries')
    parser.add_argument('--split', action='store_true', help='split entitlement values')
    parser.add_argument('--filter-ents', nargs='?', help='filter entitlements')
    parser.add_argument('--filter-vals', nargs='?', help='filter entitlement values')
    parser.add_argument('--filter-bins', nargs='?', help='filter binaries')
    group2 = parser.add_mutually_exclusive_group()
    group2.add_argument('--compact', action='store_true', help='compact list')
    group2.add_argument('--count', action='store_true', help='list count')
    args = parser.parse_args()

    conn = connect(args.db)

    if args.ents:
        sql = 'SELECT pair.key, pair.value, bin.path FROM pair JOIN bin ON bin.id = pair.binary_id'
        keys = {}
        for key, value, path in conn.execute(sql):
            if key not in keys:
                keys[key] = {}
            if args.split:
                parsed_values = json.loads(value)
                if isinstance(parsed_values, list):
                    for parsed_value in parsed_values:
                        value = json.dumps(parsed_value)
                        if value not in keys[key]:
                            keys[key][value] = [path]
                        else:
                            keys[key][value].append(path)
                else:
                    if value not in keys[key]:
                        keys[key][value] = [path]
                    else:
                        keys[key][value].append(path)
            else:
                if value not in keys[key]:
                    keys[key][value] = [path]
                else:
                    keys[key][value].append(path)
        for key in list(keys.keys()):
            if args.filter_ents and not re.search(args.filter_ents, key, re.I):
                del keys[key]
                continue
            for value in list(keys[key].keys()):
                if args.filter_vals and not re.search(args.filter_vals, value, re.I):
                    del keys[key][value]
                    continue
                for path in list(keys[key][value]):
                    if args.filter_bins and not re.search(args.filter_bins, path, re.I):
                        keys[key][value].remove(path)
                if not keys[key][value]:
                    del keys[key][value]
            if not keys[key]:
                del keys[key]
        if args.count:
            print(len(keys))
        else:
            for key in sorted(keys.keys()):
                print(f'- {key}')
                if args.compact:
                    continue
                for value in sorted(keys[key].keys()):
                    print(f'    - {value}')
                    for path in sorted(keys[key][value]):
                        print(f'        - {path}')
    elif args.bins:
        sql = 'SELECT bin.path, pair.key, pair.value FROM bin JOIN pair ON pair.binary_id = bin.id'
        paths = {}
        for path, key, value in conn.execute(sql):
            if path not in paths:
                paths[path] = {}
            if args.split:
                parsed_values = json.loads(value)
                if isinstance(parsed_values, list):
                    for parsed_value in parsed_values:
                        value = json.dumps(parsed_value)
                        if key not in paths[path]:
                            paths[path][key] = [value]
                        else:
                            paths[path][key].append(value)
                else:
                    if key not in paths[path]:
                        paths[path][key] = [value]
                    else:
                        paths[path][key].append(value)
            else:
                if key not in paths[path]:
                    paths[path][key] = [value]
                else:
                    paths[path][key].append(value)
        for path in list(paths.keys()):
            if args.filter_bins and not re.search(args.filter_bins, path, re.I):
                del paths[path]
                continue
            for key in list(paths[path].keys()):
                if args.filter_ents and not re.search(args.filter_ents, key, re.I):
                    del paths[path][key]
                    continue
                for value in list(paths[path][key]):
                    if args.filter_vals and not re.search(args.filter_vals, value, re.I):
                        paths[path][key].remove(value)
                if not paths[path][key]:
                    del paths[path][key]
            if not paths[path]:
                del paths[path]
        if args.count:
            print(len(paths))
        else:
            for path in sorted(paths.keys()):
                print(f'- {path}')
                if args.compact:
                    continue
                for key in sorted(paths[path].keys()):
                    print(f'    - {key}')
                    for value in sorted(paths[path][key]):
                        print(f'        - {value}')

    conn.close()