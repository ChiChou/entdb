# entdb

Web frontend for the Entitlement Database — browse iOS and macOS entitlements across OS versions.

## Features

- Browse entitlement keys by OS version
- Search binaries by entitlement key
- Compare entitlements across versions with diff view
- View version history for individual binaries

## Technical Details

Built as a static Next.js site deployed to GitHub Pages.

It uses pre-built static KV format (on top of JSON) with HTTP Range requests.

## Related Repositories

| Repository | Description |
|------------|-------------|
| [entdb-indexer](https://github.com/ChiChou/entdb-indexer) | Crontab workflow to discover and index firmware |
| [entdb-data](https://github.com/ChiChou/entdb-data) | Raw entitlement data repository |

## Development

```bash
npm install
npm run dev
```

## License

MIT
