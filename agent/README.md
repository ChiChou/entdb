# agent

Discover built-in Mach-O files on current macOS, skip third party apps. It is not designed to run on a mounted filesystem.

Requires Xcode Command Line Tools to build.

## Build

```bash
cc visitor.c -o visitor
```

## Usage

```bash
./visitor /
```

Note that you might need to run with sudo to get full access to system directories.
But those binaries are related to `sudo` or cups, which might not interest you.
