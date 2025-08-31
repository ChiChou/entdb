import sys


def versions():
    yield from range(1, 19)
    yield 26


if __name__ == "__main__":
    sys.stderr.write(
        "submit this list to https://theapplewiki.com/wiki/Special:Export\n"
    )
    for major in versions():
        sys.stdout.write("Firmware_Keys/%d.x\n" % major)
