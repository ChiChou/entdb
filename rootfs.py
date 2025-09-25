from pathlib import Path
import base64
import subprocess
import shutil
import tempfile
import argparse

from ipsw.reader import Reader
from osx.hdiutil import encrypted
from ipsw.theapplewiki import get_page_name, fetch_page


def extract(ipsw: str, output: str):
    reader = Reader(ipsw)

    outdir = Path(output)
    outdir.mkdir(parents=True, exist_ok=True)

    for name, path in reader.images.items():
        if name.startswith("AP,"):  # ExclaveOS, skip
            continue

        dest = outdir / (reader.version + "-" + name + ".dmg")
        if dest.exists():
            continue

        if name in ("OS", "User") or name.startswith("Cryptex1,"):
            with tempfile.TemporaryDirectory() as cwd:
                subprocess.call(["unzip", reader.ipsw, path], cwd=cwd)
                dmg = Path(cwd) / path

                if path.endswith(".dmg.aea"):
                    from ipsw.aea import get_key

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
                    subprocess.call(
                        ["vfdecrypt", "-k", key, "-i", str(dmg), "-o", dest]
                    )
                    dmg.unlink()

                else:
                    shutil.move(dmg, dest)


def main():
    parser = argparse.ArgumentParser(description="parse from ipsw")
    parser.add_argument("ipsw", type=str, nargs="+", help="Path to the .ipsw file(s)")
    parser.add_argument(
        "-o", "--output", type=str, default=".", help="Output directory"
    )
    args = parser.parse_args()

    for ipsw in args.ipsw:
        extract(ipsw, args.output)


if __name__ == "__main__":
    main()
