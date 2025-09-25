#!/usr/bin/env python3
#
# extract root fs dmg from ipsw

import plistlib
from zipfile import ZipFile


class Reader:
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
