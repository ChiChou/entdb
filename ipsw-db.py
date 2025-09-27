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
from osx.product import name as macos_name
from indexer.db import Writer
from indexer.visitor import FileSystemVisitor
from indexer.detect import is_macho
from indexer.entitlements import xml as entitlements


def filesystem_root(name: str):
    if name in ("OS", "User"):
        return "/"

    if name == "Cryptex1,SystemOS":
        return "/System/Cryptexes/OS/"
    elif name == "Cryptex1,AppOS":
        return "/System/Cryptexes/App/"

    raise ValueError(f"Unknown name: {name}")


def build_database(ipsw: str, output: Path, merge: bool):
    reader = Reader(ipsw)

    dbname = "ent.db" if merge else f'{reader.version}_{reader.build}.db'
    db = str(output / dbname)

    joint_devices = "|".join(reader.devices)
    if "iPhone" in joint_devices:
        product_name = f"iOS {reader.version}"
    elif "Mac" in joint_devices:
        product_name = macos_name(reader.version)
    else:
        raise NotImplementedError(f"Device type {reader.devices} not supported yet")

    writer = Writer(
        db,
        product_name,
        reader.build,
        reader.version,
        reader.devices,
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
        "-o", "--output", type=str, default=".", help="Database output directory"
    )
    parser.add_argument("-m", "--merge", action="store_true", help="merge to one unified sqlite database")
    args = parser.parse_args()

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    for ipsw in args.ipsws:
        build_database(ipsw, output, args.merge)


if __name__ == "__main__":
    main()
