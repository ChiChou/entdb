import logging
from pathlib import Path
from typing import Callable


class FileSystemVisitor:
    def __init__(self, root: Path, predicate: Callable[[Path], bool]=lambda x: True):
        self.root = root.resolve()
        self.predicate = predicate

    def visit(self, path: Path):
        if path.is_symlink():
            return

        if path.is_dir():
            for child in path.iterdir():
                yield from self.visit(child)
        elif path.is_file():
            if self.predicate(path):
                yield path
        else:
            raise ValueError(f"unknown file type: {path}")


if __name__ == "__main__":
    import sys
    from detect import is_macho
    logging.basicConfig(level=logging.INFO)
    root = Path(sys.argv[1]).resolve()
    visitor = FileSystemVisitor(root, predicate=is_macho)
    for path in visitor.visit(root):
        relative = path.resolve().relative_to(root)
        absolute = '/%s' % relative
        print(absolute)
