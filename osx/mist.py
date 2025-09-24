#!/usr/bin/env python3
# generate script to download mac installers
# this script requires mist-cli: `brew install mist-cli`

import json
import os
from collections import defaultdict


def fetch():
    import subprocess
    import tempfile

    with tempfile.NamedTemporaryFile(
        mode="w+", suffix=".json", delete=False
    ) as tmp_file:
        tmp = tmp_file.name

    subprocess.check_call(["mist", "list", "installer", "-e", tmp], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(tmp) as fp:
        data = json.load(fp)
    os.unlink(tmp)
    return data


def packages():
    aggregated = defaultdict(list)

    for entry in fetch():
        version = entry["version"]
        major, minor, *_ = version.split(".")

        if int(major) >= 11:  # prefer ipsw
            continue

        major_and_minor = f"{major}.{minor}"
        aggregated[major_and_minor].append(entry)

    for major_and_minor, entries in aggregated.items():
        entries.sort(key=lambda e: e["version"], reverse=True)
        latest, *_ = entries

        # dumb heuristic but works
        biggest = max(latest["packages"], key=lambda p: p["size"])
        yield dict(name=latest["name"], version=latest["version"], build=latest["build"], url=biggest["url"])


def main():
    for package in packages():
        print(f"cd '{package['name']}-{package['version']}-{package['build']}'")
        print(f"curl -L -O {package['url']}")


if __name__ == "__main__":
    main()
