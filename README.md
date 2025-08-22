# entdb

Download and process entitlement database from ipsw archives

Thanks to [blacktop/ipsw](https://github.com/blacktop/ipsw)

Requires python >= 3.10. Only tested on macOS. Other systems are not recommended,
you may encounter issues with aea decryption or apfs mounting.

## Dependencies

Download scripts requires [jq](https://jqlang.org/) and [GNU Parallel](https://savannah.gnu.org/projects/parallel/)

`brew install jq parallel`
