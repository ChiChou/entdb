from subprocess import check_call
from pathlib import Path


def expand(src: str | Path, dest: str | Path):
    check_call(["pkgutil", "--expand", str(src), str(dest)])
