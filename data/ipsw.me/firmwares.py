from urllib.request import urlopen
from pathlib import Path
import json


def fetch_with_cache(url: str, cache: str) -> bytes:
    parent = Path("cache")
    parent.mkdir(exist_ok=True)
    local = parent / cache
    if local.exists() and local.is_file():
        with local.open("rb") as fp:
            return fp.read()

    buf = urlopen(url).read()

    with local.open("wb") as fp:
        fp.write(buf)

    return buf


def keep_version(version: str) -> bool:
    segments = version.split(".")
    major, minor, *_ = segments

    # only keep major or major.minor versions
    if len(segments) > 2:
        return False

    # for old systems, only keep major version
    if int(major) < 16:
        return minor == "0"

    return True


def main():
    devices = json.loads(fetch_with_cache("https://api.ipsw.me/v4/devices", "devices"))
    models: list[str] = [dev["identifier"] for dev in devices]
    phones = [m for m in models if m.startswith("iPhone")]

    unified = {}

    # in this api, phones are already ascending
    for model in phones:
        ipsw = json.loads(
            fetch_with_cache(
                "https://api.ipsw.me/v4/device/%s?type=ipsw" % model, "ipsw-%s" % model
            )
        )

        # this item gets updated many times until the latest model
        for fw in ipsw["firmwares"]:
            version = fw["version"]
            if keep_version(version):
                unified[version] = fw["url"]

    matrix = list(unified.items())
    # for ocd people
    # matrix.sort(key=lambda x: list(map(int, x[0].split('.'))))

    for verison, url in matrix:
        print(verison, url)


if __name__ == "__main__":
    main()
