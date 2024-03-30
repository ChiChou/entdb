import struct
from enum import IntEnum
from pathlib import Path


class Headers(IntEnum):
    FAT_MAGIC = 0xcafebabe
    FAT_CIGAM = 0xbebafeca
    MH_MAGIC = 0xfeedface
    MH_CIGAM = 0xcefaedfe
    MH_MAGIC_64 = 0xfeedfacf
    MH_CIGAM_64 = 0xcffaedfe


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
    MH_DSYM = 0xa
    MH_KEXT_BUNDLE = 0xb


all_values = set(val for val in Headers)


def test(value):
    return value in all_values


def is_macho(path_or_str: Path | str):
    try:
        with Path(path_or_str).open('rb') as fp:
            buf = fp.read(16)
            if len(buf) < 16:
                return False
    except (PermissionError, FileNotFoundError) as _:
        return False

    magic, cputype, cpusubtyp, filetype = struct.unpack('>IIII', buf)
    return test(magic) # and filetype == FileType.MH_EXECUTE

