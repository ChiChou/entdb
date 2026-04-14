# entdb

Web frontend for the Entitlement Database — browse iOS and macOS entitlements across OS versions.

## Features

- Browse entitlement keys by OS version
- Search binaries by entitlement key
- Compare entitlements across versions with diff view
- View version history for individual binaries

## Technical Details

Built as a static Next.js site deployed to GitHub Pages.

Uses a dual-engine approach for data queries:

1. **WASM Engine** (primary) — Loads `ent.db` SQLite database into the browser via `@sqlite.org/sqlite-wasm`. Supports arbitrary SQL queries for rich data views and cross-version analysis.

2. **KV Engine** (fallback) — Uses pre-built static KV files with HTTP Range requests when WebAssembly is not available.

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
