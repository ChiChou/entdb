import json
import plistlib
import subprocess
import zipfile

from pathlib import Path
from multiprocessing import Pool


dbs = Path("sqlite")
dbs.mkdir(exist_ok=True)


def metadata(ipsw: Path):
    preserve_keys = ["ProductVersion", "ProductBuildVersion", "SupportedProductTypes"]

    with zipfile.ZipFile(ipsw) as zf:
        data = zf.read("Restore.plist")
        version = plistlib.loads(data)
        return {k: version[k] for k in preserve_keys if k in version}


def worker(f: Path):
    meta = metadata(f)

    version = meta["ProductVersion"]
    build = meta["ProductBuildVersion"]

    db_file = dbs / f"{version}_{build}.db"
    json_file = db_file.with_suffix(".json")

    with open(json_file, "w") as fp:
        json.dump(meta, fp, separators=(",", ":"))

    cmd = ["ipsw", "ent", "--sqlite", str(db_file), "--ipsw", str(f)]
    subprocess.call(cmd)


def main(src: str):
    ipsw = Path(src)

    if not ipsw.exists():
        raise RuntimeError(f"{src} does not exist")

    if ipsw.is_file():
        worker(ipsw)
    elif ipsw.is_dir():
        with Pool() as pool:
            pool.map(worker, ipsw.glob("*.ipsw"))
    else:
        raise RuntimeError(f"unexpected file type {src}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <ipsw|dir>")
        sys.exit(1)

    main(sys.argv[1])
