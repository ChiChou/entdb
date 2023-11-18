# entdb

Self-hosted entitlement database, on macOS only. No 3rd-party dependency except `codesign` from macOS.

`cli.py` to create database. See `query.py` for making queries.

## Usage

```bash
ipsw mount fs ~/Downloads/iPhone100,0_100.0_AAAAA_Restore.ipsw
# • Mounted fs DMG 000-00000-000.dmg
# • Press Ctrl+C to unmount '/tmp/000-00000-000.dmg.mount'

# another terminal
python3 cli.py /tmp/000-00000-000.dmg.mount
# tweak query.py to your needs
python3 query.py
```