#!/usr/bin/env -S PYTHONPATH=. uv run --script

from pathlib import Path
import base64
import subprocess
import shutil
import tempfile
import argparse

from ipsw.reader import Reader
from ipsw.aea import get_key
from ipsw.theapplewiki import get_page_name, fetch_page
from osx.hdiutil import encrypted, mount_to, unmount
from indexer.db import Writer
from indexer.visitor import FileSystemVisitor
from indexer.detect import is_macho
from indexer.entitlements import xml as entitlements


def filesystem_root(name: str):
    if name in ("OS", "User"):
        return "/"

    prefix = "Cryptex1,"
    suffix = "OS"

    if name.startswith(prefix) and name.endswith(suffix):
        between = name[len(prefix) : -len(suffix)]
        return f"/System/Cryptexes/{between}/"

    raise ValueError(f"Unknown name: {name}")


def build_database(ipsw: str, output: str):
    reader = Reader(ipsw)
    writer = Writer(
        output, f"iOS {reader.version}", reader.build, reader.version, reader.devices
    )

    with tempfile.TemporaryDirectory() as cwd:
        for name, path in reader.images.items():
            dest = Path(cwd) / f"{reader.version}-{name}.dmg"

            subprocess.call(["unzip", reader.ipsw, path], cwd=cwd)
            dmg = Path(cwd) / path

            if path.endswith(".dmg.aea"):
                with dmg.open("rb") as fp:
                    key = get_key(fp)

                b64key = base64.b64encode(key).decode()
                subprocess.call(
                    [
                        "aea",
                        "decrypt",
                        "-i",
                        str(dmg),
                        "-o",
                        dest,
                        "-key-value",
                        f"base64:{b64key}",
                    ]
                )
                dmg.unlink()

            elif encrypted(str(dmg)):
                device, *_ = reader.devices
                page_name = get_page_name(device, reader.build)
                content = fetch_page(page_name)
                (key,) = content["rootfs"]["key"]
                subprocess.call(["vfdecrypt", "-k", key, "-i", str(dmg), "-o", dest])
                dmg.unlink()

            else:
                shutil.move(dmg, dest)

            prefix = filesystem_root(name)
            try:
                root = mount_to(str(dest))
            except:
                continue

            visitor = FileSystemVisitor(predicate=is_macho)
            for path in visitor.visit(Path(root)):
                relative = path.resolve().relative_to(root)
                absolute = f"{prefix}{relative}"
                xml = entitlements(str(path))
                writer.insert(absolute, xml)

            unmount(root)


def main():
    parser = argparse.ArgumentParser(
        description="create sqlite entitlements db from ipsw"
    )
    parser.add_argument("ipsws", type=str, nargs="+", help="Path to the .ipsw file(s)")
    parser.add_argument(
        "-o", "--output", type=str, default="ent.db", help="Database output path"
    )
    args = parser.parse_args()
    for ipsw in args.ipsws:
        build_database(ipsw, args.output)


if __name__ == "__main__":
    main()
