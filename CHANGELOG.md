# Changelog

## 2.0.8 — 2026-10-04

- Fix pagination's duplicate updates and missing page/size event arguments. Keep search filters when paging or retrying, and reset to page one when changing page size.
- Ignore stale list responses, retain previously loaded content during a failed refresh, and distinguish loading, empty results and retryable network errors. Keep the search field mounted while loading.
- Explain unsuccessful likes without logging raw authenticated HTTP errors; suppress overlapping toggle requests and expose the button's pressed state to assistive technology.
- Update the existing pnpm setup and registry login actions to their current Node 24 releases. Remove unused bindings and obsolete lint suppression; lint now has zero warnings.
- Add focused component and request-race regressions. No database schema or existing upload changes.

## 2.0.7 — 2026-10-04

- Serve uploaded documents with an isolated content-security policy, no MIME sniffing and no outgoing referrer. A forged allowed MIME type can no longer make an HTML filename execute as part of the application origin.
- Preserve file bytes, timestamp names, image/media paths and downloads. Keep native PDF viewing separate from the document sandbox, which can interfere with built-in PDF viewers.
- Add actual multipart/HTTP and response-policy regressions. The production database, upload directory and stored records remain unchanged.

## 2.0.6 — 2026-10-04

- Atomically claim the existing last-check-in date before awarding coins. Concurrent requests receive the existing 409 response instead of duplicate rewards; the returned balance is read within the same transaction.
- Preserve server-local daily boundaries, streak reset/continuation and the original 5–12 coin rewards. No new database field or migration is required.
- A local regression first reproduced five rewards from twelve concurrent requests. The fix passed repeated real MySQL first-day and existing-date races plus business-rule and persistence tests.

## 2.0.5 — 2026-10-04

- Keep the complete stored attachment filename, including its timestamp, in display labels, image descriptions and download names. Decode the URL transport layer exactly once; literal percent sequences remain literal and no filename mapping is introduced.
- Align the advertised PDF upload format across frontend and backend. Preserve existing authentication, image-only avatar restrictions and the 10 MB limit.
- Add filename display/download, actual multipart PDF-to-disk-to-read, client upload identity, unsupported-format and size-limit regression tests. Existing database records and uploaded files are untouched.

## 2.0.4 — 2026-10-04

- Remove obsolete nested frontend/backend lockfiles and workspace configurations. The root workspace now owns installation in every directory; the removed files remain recoverable in Git history.
- Copy complete workspace metadata and package links into the runtime image. Invoke the installed Prisma CLI directly for disposable CI schema setup, so container checks never trigger an implicit package-manager install.
- Version 2.0.3's isolated-image gate caught the nested workspace reinstall failure before registry publishing or server deployment; the running production app was not touched.

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
