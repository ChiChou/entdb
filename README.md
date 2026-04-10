# entdb-web

Web frontend for the Entitlement Database.

Uses a WASM SQLite3 query engine as the primary data source for rich queries,
with a KV-based fallback for browsers that don't support WebAssembly.

Built as a static Next.js site deployed to GitHub Pages.

## Data Sources

The frontend uses a dual-engine approach:

1. **WASM Engine** (primary) — Loads `ent.db` SQLite database into the browser
   via `@sqlite.org/sqlite-wasm`. Supports arbitrary SQL queries for rich data
   views and cross-version analysis.

2. **KV Engine** (fallback) — Uses pre-built static KV files (index + blob)
   with HTTP Range requests. Used when WebAssembly is not available.

## Related Repos

- [entdb-indexer](https://github.com/ChiChou/entdb-indexer) — Crontab workflow to discover and index firmware
- [entdb-data](https://github.com/ChiChou/entdb-data) — Raw entitlement data repository
