import sys
import stat


def cpio_reader(stream):
    CPIO_MAGIC = b"070707"
    HEADER_SIZE = 76

    while True:
        header = stream.read(HEADER_SIZE)
        magic = header[0:6]
        assert magic == CPIO_MAGIC

        file_mode_oct = header[18:24]
        name_size_oct = header[59:65]
        file_size_oct = header[65:76]

        file_mode = int(file_mode_oct, 8)
        name_size = int(name_size_oct, 8)
        file_size = int(file_size_oct, 8)

        filename_bytes = stream.read(name_size)
        if len(filename_bytes) < name_size:
            raise EOFError("Unexpected end of stream while reading file name")

        filename = filename_bytes.decode("ascii").rstrip("\0")
        if filename == "TRAILER!!!":
            return

        content = stream.read(file_size)
        if len(content) < file_size:
            raise EOFError("Unexpected end of stream while reading content.")

        yield file_mode, filename, content


if __name__ == "__main__":
    for mode, filename, content in cpio_reader(sys.stdin.buffer):
        if stat.S_ISDIR(mode):
            continue

        # todo: check Mach-O magic
        print(oct(mode), filename)
