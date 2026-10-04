# Changelog

## 2.0.3 — 2026-10-04

- Preserve login through 403 permission errors and transient network/server failures. Clear only the authenticated token rejected with 401; stale requests cannot invalidate newer sessions.
- Handle malformed/base64url JWTs safely, synchronize expired sessions with reactive UI, share profile requests, reject stale profile responses and clear achievement caches on logout. Add a profile-refresh retry state.
- Boot an isolated candidate container and check health/revision plus a read-only forum endpoint before replacing the running app. Keep rollback for post-replacement failures.
- Run the built image against a separate disposable MySQL service in CI before publishing it, covering the actual production entrypoint and database-backed read contract.
- Stop running database migrations automatically at app startup. Schema changes now require a separate, explicit backup-first operator action.
- Version 2.0.2 passed Linux tests and image building but failed production startup; automatic rollback restored the old application. The exact startup error was not captured, so no unsupported cause is asserted.

## 2.0.2 — 2026-10-04

- Make isolated integration authentication self-contained: explicitly supply and assert a one-hour test JWT expiry instead of accidentally relying on the local ignored `.env`.
- CI's login simulation exposed the missing test configuration and skipped deployment again. Production credentials and expiration policy are unchanged.

## 2.0.1 — 2026-10-04

- Fix a Windows/Git filename-case mismatch before deployment: Git now tracks `articleRoutes.js` exactly as imported.
- Check Git's canonical tracked filenames as well as physical directory entries in local import tests.
- The 2.0.0 CI test gate rejected the inconsistent path and skipped deployment; no production update or database change occurred.

## 2.0.0 — 2026-10-04

- Rebuild the homepage as a responsive Minecraft creation portal with an isometric block world, searchable project/film/member archive, community activity, check-in and copyable server address.
- Preserve the existing film, mod, member, Youku-era and creator history. Replace the permanently-online badge with bounded, cached server status and an explicit unknown/stale state.
- Upgrade Vite to 8, Vitest to 5, ESLint to 10, Multer to 2.4 and compatible dependencies. Replace the obsolete Markdown editor with an asynchronously loaded, locally bundled editor and sanitized previews.
- Parse multipart filenames directly as UTF-8. Preserve the timestamp business rule and literal percent characters. Returned filenames match disk filenames; only URL path segments use URI transport escaping.
- Fix Linux import casing, missing viewport/language metadata, mobile navigation, reactive administrator menus, keyboard skip navigation and hanging API misses.
- Use one workspace lockfile in Docker/CI, Node 24, secret/upload build exclusions, immutable release images, app-only deployment, health checks and previous-image rollback. Production MySQL settings and its existing data mount are unchanged.
- Add frontend, backend and isolated MySQL integration tests. No production migration SQL or schema changes.
