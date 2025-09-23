import subprocess
import plistlib


def hdiutil(*args: str) -> bytes:
    return subprocess.check_output(["hdiutil", *args])


def mount_to(dmg: str, mount: str | None = None) -> str:
    args = ["attach"]

    if mount is not None:
        args += ["-mountpoint", mount]

    args += ["-nobrowse", "-plist", dmg]
    buf = hdiutil(*args)
    plist = plistlib.loads(buf)
    for entry in plist["system-entities"]:
        try:
            return entry["mount-point"]
        except KeyError:
            pass

    raise RuntimeError("not reached")


def unmount(mount_point: str) -> None:
    hdiutil("detach", mount_point)


def encrypted(dmg: str) -> bool:
    buf = hdiutil("isencrypted", "-plist", dmg)
    plist = plistlib.loads(buf)
    return plist["encrypted"]


# def mount_point(dmg: str) -> str:
#     import plistlib
#     info = plistlib.loads(hdiutil("info", "-plist"))

#     for image in info["images"]:
#         if image["image-path"] == dmg:
#             for entity in image["system-entities"]:
#                 try:
#                     return entity["mount-point"]
#                 except KeyError:
#                     pass

#     raise RuntimeError("unable to find mount point for %s" % dmg)


class DiskImage:
    _mp: str | None

    def __init__(self, dmg: str, dest: str | None = None):
        self._dmg = dmg
        self._mp = None
        self._dest = dest

    def __enter__(self):
        mp = mount_to(self._dmg, self._dest)
        self._mp = mp
        return mp

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._mp is not None:
            unmount(self._mp)


def ramdisk(size: int):
    attach_args = ["hdiutil", "attach", "-nomount", ("ram://%d" % size)]
    dev = subprocess.check_output(attach_args).decode().strip()

    format_args = ["diskutil", "erasevolume", "APFS", "RAMDisk", dev]
    subprocess.check_call(format_args)

    info_args = ["hdiutil", "info", "-plist"]
    buf = subprocess.check_output(info_args)
    plist = plistlib.loads(buf)
    for image in plist["images"]:
        entities = image["system-entities"]
        found = any(entity for entity in entities if entity["dev-entry"] == dev)
        if not found:
            continue

        for entity in entities:
            try:
                # todo: see if it is necessary to return dev
                return entity["mount-point"]
            except KeyError:
                pass

    raise RuntimeError("Unable to find mount point for %s" % dev)


class RamDisk:
    _size: int
    _mp: str | None

    def __init__(self, sz=1048576):
        self._size = sz
        self._mp = None

    def __enter__(self):
        mp = ramdisk(self._size)
        self._mp = mp
        return mp

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._mp is not None:
            unmount(self._mp)
