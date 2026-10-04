# Changelog

## 2.0.0 — 2026-10-04

- Rebuild the homepage as a responsive Minecraft creation portal with an isometric block world, searchable project/film/member archive, community activity, check-in and copyable server address.
- Preserve the existing film, mod, member, Youku-era and creator history. Replace the permanently-online badge with bounded, cached server status and an explicit unknown/stale state.
- Upgrade Vite to 8, Vitest to 5, ESLint to 10, Multer to 2.4 and compatible dependencies. Replace the obsolete Markdown editor with an asynchronously loaded, locally bundled editor and sanitized previews.
- Parse multipart filenames directly as UTF-8. Preserve the timestamp business rule and literal percent characters. Returned filenames match disk filenames; only URL path segments use URI transport escaping.
- Fix Linux import casing, missing viewport/language metadata, mobile navigation, reactive administrator menus, keyboard skip navigation and hanging API misses.
- Use one workspace lockfile in Docker/CI, Node 24, secret/upload build exclusions, immutable release images, app-only deployment, health checks and previous-image rollback. Production MySQL settings and its existing data mount are unchanged.
- Add frontend, backend and isolated MySQL integration tests. No production migration SQL or schema changes.
