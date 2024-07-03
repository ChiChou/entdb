from pathlib import Path


def strip_slash(path: str):
    if path.startswith('/'):
        path = path[1:]

    if path.endswith('/'):
        path = path[:-1]

    return path


class PathFinder:
    def __init__(self, rule_file: Path):
        self.rule_file = rule_file
        self.exclude_tree = {}
        self.includes = set()
        self.parse()

    def parse(self):
        with self.rule_file.open() as fp:
            for line in fp:
                rule = line.strip()

                if not len(rule) or rule.startswith('#'):
                    continue

                self.add(rule)

    def entries(self):
        return self.includes

    def add(self, rule: str):
        if rule.startswith('!'):
            self.exclude(rule[1:])
        else:
            self.includes.add(strip_slash(rule))  # strip /

    def exclude(self, path: str):
        leaf = self.exclude_tree
        for name in strip_slash(path).split('/'):
            if name not in leaf:
                leaf[name] = {}

            leaf = leaf[name]

    def is_excluded(self, relative: str):
        leaf = self.exclude_tree
        for name in strip_slash(relative).split('/'):
            leaf = leaf.get(name)
            if leaf is None:
                return False
            if leaf == {}:
                return True
        return False
