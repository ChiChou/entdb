import shutil
from pathlib import Path

from osx.hdiutil import DiskImage
from osx.pkg import expand


class Unpacker:
    output: Path
    override: bool  # override output directory

    def __init__(self, output: str, override=False):
        self.output = o = Path(output)

        if o.exists():
            if not o.is_dir():
                raise RuntimeError("'%s' exists and is not a directory")
            if override:
                shutil.rmtree(str(o))

        # o could either exist or not
        # also exist_ok refers to intermediate files, not related to param here
        o.mkdir(parents=True, exist_ok=True)

    """
    generate a child directory for extracting packages
    """

    def expand(self, pkg: Path) -> Path:
        cwd = self.output / pkg.name.replace(".", "_")
        if not cwd.exists():
            expand(pkg, cwd)

        return cwd

    """
    macOS High Sierra (10.13)
    macOS Mojave (10.14)
    macOS Catalina (10.15)
    """

    def handle_install_esd_pkg(self, pkg: Path):
        esd_dmg = self.expand(pkg) / "InstallESD.dmg"
        return self.handle_installesd_dmg(esd_dmg)

    """
    example: Core.pkg
    """

    def handle_filesystem_pkg(self, pkg: Path):
        extracted = self.expand(pkg)
        return extracted / "Payload"

    def handle_installesd_dmg(self, dmg: Path):
        with DiskImage(str(dmg)) as mount_root:
            root = Path(mount_root)
            packages = root / "Packages"
            candidates = [
                "Core",  # >= 10.13
                "BSD",
                "BaseSystemBinaries",
                "Essentials",  # 10.12 has only this
            ]

            paths = [packages / ("%s.pkg" % name) for name in candidates]
            return [self.handle_filesystem_pkg(path) for path in paths if path.exists()]

    """
    OS X Lion (10.7)
    OS X Mountain Lion (10.8)
    OS X Yosemite (10.10)
    El Capitan (10.11)
    Sierra (10.12)
    """

    def handle_dmg(self, dmg: Path):
        pkg_name = dmg.with_suffix(".pkg").name

        with DiskImage(str(dmg)) as mount_point:
            root = Path(mount_point)
            main_pkg = root / pkg_name
            cwd = self.expand(main_pkg)
            esd_dmg = cwd / pkg_name / "InstallESD.dmg"
            return self.handle_installesd_dmg(esd_dmg)

    def unpack(self, path: Path):
        name = path.name
        if name in ("InstallOS.dmg", "InstallMacOSX.dmg"):
            return self.handle_dmg(path)
        elif name == "InstallESDDmg.pkg":
            return self.handle_install_esd_pkg(path)
        raise NotImplementedError("%s unpacker not implemented" % name)
