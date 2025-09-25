#!/usr/bin/env -S PYTHONPATH=. uv run --script

import subprocess
import stat

from pathlib import Path

from indexer.db import Writer
from indexer.detect import check_magic
from indexer.entitlements import xml
from osx.hdiutil import RamDisk
from osx.cpio import read as read_cpio
from osx.unpack import Unpacker


def read_pkg(pkg: Path, tmpdir: str):
    args = []
    filename = str(pkg)

    with pkg.open("rb") as fp:
        dword: bytes = fp.read(4)
        if dword == b"pbzx":
            args = ["pbzx", "-n", filename]
        elif dword.startswith(b"BZ") or dword.startswith(b"\x1f\x8b"):
            args = ["gunzip", "-c", filename]
        else:
            raise ValueError("unknown file type (magic %r)" % dword)

    proc = subprocess.Popen(args, stdout=subprocess.PIPE)
    tmp = Path(tmpdir) / "file"

    for mode, name, content in read_cpio(proc.stdout):
        if stat.S_ISDIR(mode):
            continue

        if not check_magic(content):
            continue

        # remove leading .
        path = name[1:]

        with tmp.open("wb") as fp:
            fp.write(content)

        entitlements = xml(str(tmp))
        if entitlements:
            yield path, entitlements


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="create sqlite entitlements db from osx installer packages"
    )
    parser.add_argument(
        "pkgs", type=str, nargs="+", help="Path to the legacy osx installer(s)"
    )
    parser.add_argument(
        "-o", "--output", type=str, default="osx.db", help="Database output path"
    )
    args = parser.parse_args()

    with RamDisk() as rd:
        for pkg in args.pkgs:
            p = Path(pkg)
            name, version, build = p.parent.name.rsplit("-", 2)
            u = Unpacker("output-%s" % build)
            db = Writer(args.output, name, version, build, ["Mac"])
            results = u.unpack(p)
            for item in results:
                print("processing", item)
                for path, entitlements in read_pkg(item, rd):
                    db.insert(path, entitlements)


if __name__ == "__main__":
    main()
