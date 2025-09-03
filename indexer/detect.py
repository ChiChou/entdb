import struct
from enum import IntEnum
from pathlib import Path


class Headers(IntEnum):
    FAT_MAGIC = 0xCAFEBABE
    FAT_CIGAM = 0xBEBAFECA
    MH_MAGIC = 0xFEEDFACE
    MH_CIGAM = 0xCEFAEDFE
    MH_MAGIC_64 = 0xFEEDFACF
    MH_CIGAM_64 = 0xCFFAEDFE


class FileType(IntEnum):
    MH_OBJECT = 0x1
    MH_EXECUTE = 0x2
    MH_FVMLIB = 0x3
    MH_CORE = 0x4
    MH_PRELOAD = 0x5
    MH_DYLIB = 0x6
    MH_DYLINKER = 0x7
    MH_BUNDLE = 0x8
    MH_DYLIB_STUB = 0x9
    MH_DSYM = 0xA
    MH_KEXT_BUNDLE = 0xB


all_values = set(val for val in Headers)

HEADER_FMT = ">IIII"
HEADER_SIZE = struct.calcsize(HEADER_FMT)

__all__ = ["check_magic", "is_macho"]


def check_magic(buf: bytes):
    if len(buf) < HEADER_SIZE:
        return False
    elif len(buf) > HEADER_SIZE:
        header = buf[0:HEADER_SIZE]
    else:
        header = buf

    magic, cputype, cpusubtyp, filetype = struct.unpack(HEADER_FMT, header)
    return magic in all_values  # and filetype == FileType.MH_EXECUTE


def is_macho(path_or_str: Path | str) -> bool:
    try:
        with Path(path_or_str).open("rb") as fp:
            buf = fp.read(HEADER_SIZE)
    except (PermissionError, FileNotFoundError):
        return False

    return check_magic(buf)
