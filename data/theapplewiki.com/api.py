import urllib.parse
import urllib.request
import json

# https://theapplewiki.com/wiki/The_Apple_Wiki:Key_pages#Semantic_MediaWiki


def concat_url(params: str):
    base_url = "https://theapplewiki.com/wiki/Special:Ask"
    page = "".join(map(lambda s: s.strip(), params.splitlines()))
    return base_url + urllib.parse.quote(page)


def format_url_get_page(model: str, version: str):
    url_template = f"""
        /-5B-5B:Keys:-2B-5D-5D
        /-5B-5BHas firmware device::{model}-5D-5D
        /-5B-5BHas firmware version::{version}-5D-5D
        /-3FHas download URL=url
        /-3FHas firmware baseband=baseband
        /-3FHas firmware build=build
        /-3FHas firmware codename=codename
        /-3FHas firmware device=device
        /-3FHas firmware version=version
        /-3FHas operating system=os
        /mainlabel=name
        /limit=1
        /format=json
        /type=simple"""

    return concat_url(url_template)


def format_url_fetch_key(page: str):
    url_template = f"""
        /-5B-5B-2DHas subobject::{page}-5D-5D
        /-3FHas filename=filename
        /-3FHas firmware device=device
        /-3FHas key=key
        /-3FHas key IV=iv
        /-3FHas key KBAG=kbag
        /-3FHas key DevKBAG=devkbag
        /mainlabel=filename
        /format=json
        /type=simple
    """

    return concat_url(url_template)


if __name__ == "__main__":
    import sys

    url1 = format_url_get_page("iPhone5,4", "7.0.5")
    sys.stderr.write(url1 + "\n")
    resp1 = urllib.request.urlopen(url1).read()
    # does not work, blocked by CloudFlare
    result1: dict[str, dict] = json.loads(resp1)
    val = next(iter(result1.values()))
    print(val)
