import argparse
import plistlib
from zipfile import ZipFile


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

    def extract(self):
        for name, path in self.images.items():
            if name.startswith("AP,"):  # ExclaveOS, skip
                continue
            if name.startswith("Cryptex1,"):
                cryptex = name[len("Cryptex1,") :]
                prefix = "/System/Volumes/Preboot/Cryptexes/" + cryptex
                continue

            print(name, path)


# def print_images(images: dict[str, str]):
#     user = images.get("User")
#     # iPhone OS 1.x and 2.x
#     if user:
#         print("unzip -l ipsw %s" % user)
#         return

#     # iPhone OS 3.x and later
#     for name, path in images.items():
#         print("(%s) unzip -l ipsw %s" % (name, path))


def main():
    parser = argparse.ArgumentParser(description="parse from ipsw")
    parser.add_argument("ipsw", type=str, nargs="+", help="Path to the .ipsw file(s)")
    parser.add_argument(
        "--tmp",
        type=str,
        help="Path to the temporary directory (recommend to use ramdisk)",
        nargs="?",
    )
    args = parser.parse_args()

    for ipsw in args.ipsw:
        print(ipsw)
        Extractor(ipsw).extract()


if __name__ == "__main__":
    main()
