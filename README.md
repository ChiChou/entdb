# Entitlement Database Collector

Build entitlement databases from ipsw and legacy OS X installer packages.

For web frontend, please check `web` branch.

Supports legacy encrypted filesystem image (iOS < 10). It requires network connection to query [theapplewiki](https://theapplewiki.com/) for encryption keys. Also for aea decryption, it is required to be online.

## Requirements

Due to many Apple proprietaries (aea, APFS filesystem, etc), all those scripts only support macOS.
There might be opensource solutions that support other system as well.

We recommend [uv](https://docs.astral.sh/uv/) as python virtual environment manager.

## Dependencies

* [vfdecrypt](https://github.com/chichou/vfdecrypt) my vfdecrypt fork to support up to date macOS sdk
* [mist-cli](https://github.com/ninxsoft/mist-cli) command line tool to download macOS installers. `brew install mist-cli`
* [pbzx](https://github.com/NiklasRosenstein/pbzx) pbzx stream parser for macOS installer packages. `brew install pbzx`

builtin macOS commands:

* `codesign`: to parse entitlements
* `hdiutil`: to mount disk images
* `diskutil`: format APFS, to create ramdisk for temp file drops
* `unzip`: extract files from ipsw
* `aea`: aea decryption

## Scripts

### `ipsw-db.py`

build database from ipsw.

### `mist.py`

generate download script to get OS X installers.

### `osx-db.py`

build database from OS X installer. Takes the output from `mist.py`. Note that the folder structure must match following format:

`macOS Mojave-10.14.6-18G103/InstallESDDmg.pkg`

Otherwise the script does not know how to read build and version data from the package.

### `db2static.py`

Optional script, to build textual "databases` for my html web front, since I don't want to
use SQLite on WASM (not available on iOS Lockdown mode) or any backend.

The web front consists of completely static files that you can host on any http server.
