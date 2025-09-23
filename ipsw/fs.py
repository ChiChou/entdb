#!/usr/bin/env python3
#
# extract root fs dmg from ipsw

import argparse
import plistlib
from zipfile import ZipFile
from pathlib import Path


class Extractor:
    version: str
    build: str
    devices: list[str]
    images: dict[str, str]

    def __init__(self, ipsw: str):
        self.ipsw = ipsw
        self.images = {}

        self.parse_metadata()

    def parse_build_manifest(self, plist: dict):
        self.version = plist["ProductVersion"]
        self.build = plist["ProductBuildVersion"]
        self.devices = plist["SupportedProductTypes"]

        self.images = {}
        for identity in plist["BuildIdentities"]:
            for name, info in identity["Manifest"].items():
                if name == "RestoreRamDisk":
                    continue

                path: str = info.get("Info", {}).get("Path", "")
                if path.endswith(".dmg") or path.endswith(".dmg.aea"):
                    self.images[name] = path

    def parse_restore(self, plist: dict):
        self.version = plist["ProductVersion"]
        self.build = plist["ProductBuildVersion"]
        self.devices = [plist["ProductType"]]

        try:
            restore_images: dict[str, str] = plist["SystemRestoreImages"]
            self.images = restore_images
        except KeyError:
            raise NotImplementedError("Unknown restore image format: %r" % plist)

    def parse_metadata(self):
        with ZipFile(self.ipsw, "r") as zf:

            def load(name):
                buf = zf.read(name)
                return plistlib.loads(buf)

            try:
                self.parse_build_manifest(load("BuildManifest.plist"))
            except KeyError:
                try:
                    self.parse_restore(load("Restore.plist"))
                except KeyError:
                    raise RuntimeError("Invalid ipsw")

    def extract(self, output: str):
        outdir = Path(output)
        outdir.mkdir(parents=True, exist_ok=True)

        for name, path in self.images.items():
            if name.startswith("AP,"):  # ExclaveOS, skip
                continue

            dest = outdir / (self.version + "-" + name + ".dmg")
            if dest.exists():
                continue

            if name in ("OS", "User") or name.startswith("Cryptex1,"):
                import subprocess
                import shutil
                import tempfile
                from osx.hdiutil import encrypted
                from theapplewiki import get_page_name, fetch_page

                with tempfile.TemporaryDirectory(dir=outdir) as cwd:
                    subprocess.call(["unzip", self.ipsw, path], cwd=cwd)
                    dmg = Path(cwd) / path

                    if encrypted(str(dmg)):
                        device, *_ = self.devices
                        page_name = get_page_name(device, self.build)
                        content = fetch_page(page_name)
                        (key,) = content["rootfs"]["key"]
                        subprocess.call(
                            ["vfdecrypt", "-k", key, "-i", str(dmg), "-o", dest]
                        )
                        dmg.unlink()

                    else:
                        shutil.move(dmg, dest)


def task(args):
    ipsw, output = args
    e = Extractor(ipsw)
    e.extract(output)


def main():
    import multiprocessing

    parser = argparse.ArgumentParser(description="parse from ipsw")
    parser.add_argument("ipsw", type=str, nargs="+", help="Path to the .ipsw file(s)")
    parser.add_argument(
        "-j", "--jobs", type=int, default=1, help="Number of parallel jobs"
    )
    parser.add_argument(
        "-o", "--output", type=str, default=".", help="Output directory"
    )
    args = parser.parse_args()
    pool = multiprocessing.Pool(args.jobs)
    pool.map(task, [(ipsw, args.output) for ipsw in args.ipsw])


if __name__ == "__main__":
    main()
