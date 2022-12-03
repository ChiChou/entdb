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


all_values = set(val for val in Headers)


def test(value):
    return value in all_values


def is_macho(path_or_str: Path | str):
    try:
        with Path(path_or_str).open('rb') as fp:
            buf = fp.read(4)
            if len(buf) < 4:
                return False
    except (PermissionError, FileNotFoundError) as _:
        return False

    magic, = struct.unpack('I', buf)
    return test(magic)
