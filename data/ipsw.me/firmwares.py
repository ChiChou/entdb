from urllib.request import urlopen
from pathlib import Path
from collections import defaultdict
import json


def fetch_with_cache(url: str, cache: str) -> bytes:
    parent = Path("cache")
    parent.mkdir(exist_ok=True)
    local = parent / cache
    if local.exists() and local.is_file():
        if (local.stat().st_mtime + 86400) > (Path().stat().st_mtime):
            with local.open("rb") as fp:
                return fp.read()

    buf = urlopen(url).read()

    with local.open("wb") as fp:
        fp.write(buf)

    return buf


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
            unified[version] = {
                "url": fw["url"],
                "model": model,
                "version": fw["version"],
                "build": fw["buildid"],
                "releasedate": fw["releasedate"],
                "md5": fw["md5sum"],
                "sha1": fw["sha1sum"],
                "sha256": fw["sha256sum"],
            }

    # group by major.minor
    groups = defaultdict(list)

    for version, fw in unified.items():
        segments = version.split(".")
        numbers = list(map(int, segments))
        major, minor, *_ = segments
        key = "%s.%s" % (major, minor)
        groups[key].append((numbers, fw))

    latest_minor_versions = []
    for key, group in groups.items():
        group.sort(key=lambda x: x[0])
        latest_minor_versions.append(group[-1])

    latest_minor_versions.sort(key=lambda x: x[0])
    result = [x[1] for x in latest_minor_versions]

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
