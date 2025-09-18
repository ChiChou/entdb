import urllib.parse
import urllib.request
import json

# https://theapplewiki.com/wiki/The_Apple_Wiki:Key_pages#Semantic_MediaWiki


def concat_url(params: str):
    base_url = "https://theapplewiki.com/wiki/Special:Ask"
    page = "".join(map(lambda s: s.strip(), params.splitlines()))
    return base_url + urllib.parse.quote(page)


def format_url_get_name(model: str, build: str):
    url_template = f"""
        /-5B-5B:Keys:-2B-5D-5D
        /-5B-5BHas firmware device::{model}-5D-5D
        /-5B-5BHas firmware build::{build}-5D-5D
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
        /mainlabel=filename
        /format=json
        /type=simple
    """

    return concat_url(url_template)


def fetch(url: str) -> dict[str, dict]:
    req = urllib.request.Request(
        url, headers={"User-Agent": "HTTPie/3.2.4", "Accept": "application/json"}
    )

    resp = urllib.request.urlopen(req).read()
    result: dict[str, dict] = json.loads(resp)
    return result


def get_page_name(model: str, build: str) -> str:
    url = format_url_get_name(model, build)
    result = fetch(url)
    val = next(iter(result.values()))
    name, *_ = val["name"]
    return name


def fetch_page(key: str) -> dict[str, dict]:
    url = format_url_fetch_key(key)
    return fetch(url)


if __name__ == "__main__":
    import sys

    key = get_page_name(sys.argv[1], sys.argv[2])
    content = fetch_page(key)
    print(content)
