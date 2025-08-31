## Experimental theapplewiki Api

[The Apple Wiki](https://theapplewiki.com) offers
[API](https://theapplewiki.com/wiki/The_Apple_Wiki:Key_pages) to search firmware keys.

However we need to bypass CloudFlare waf even for basic automation of this api, making
it very much useless.

* api.py
* api.ts

In the end I simply generate the name of the pages, then use
[Export](https://theapplewiki.com/wiki/Special:Export) feature of MediaWiki to download
them as XML.
