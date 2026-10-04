# lomleague ongoing modernization

## Scope and invariants

- Work only in `E:\ClaudeCode\lomleague`; do not rescan D: or E:.
- Keep the local Git identity and SSH commit signing configuration.
- Upload filenames retain the existing timestamp prefix and original readable name. Do not introduce a UUID/original-name mapping or decode percent sequences in multipart filenames.
- Do not reset databases, run destructive schema synchronization against production, recreate MySQL, remove volumes, or remove existing uploads.
- Batch local tests and builds before pushing. Verify Actions, the commit signature, and the live page after release.
- The indefinite goal remains active. A thread heartbeat named “lomleague 持续重构与发布” runs every 30 minutes. It requires the desktop app and host to remain running; quota availability still governs execution.

## Working batch: 2.0.0 (not yet released)

- New responsive homepage, code-native isometric block world, searchable film/project/member archive, preserved historical records, check-in, and real cached Minecraft status.
- Vite 8, Vue and compatible dependency updates, Vitest 5, ESLint 10, Multer 2.4.
- Multer now parses ordinary filename headers as UTF-8. Manual latin1 round trips and incorrect URI decoding are removed; URLs alone encode path segments for transport.
- Linux import casing corrected. API misses return 404 instead of hanging. Health response contains version/revision.
- UI imports are tree-shaken, the old Markdown editor is replaced by locally bundled md-editor-v3 + DOMPurify and loaded asynchronously. Existing Markdown and safe HTML are covered by compatibility tests. Viewport/language/description metadata, mobile navigation and keyboard skip link are fixed.
- Workspace-lockfile Docker build on Node 24, secret/upload exclusions, immutable image tags, app-only deployment, health gate, previous-image rollback; MySQL image/config/mount unchanged.

## Checks so far

- `pnpm build` passed repeatedly. `pnpm lint` has zero errors (13 existing warnings).
- `pnpm test` with `LOM_TEST_DATABASE_URL`: 67 passing tests, including real local HTTP multipart → filesystem → URL fixtures, status caching/failures, app health/API contracts, case-sensitive imports, archive search, Markdown sanitization, no remote editor asset injection, and real MySQL registration/login/forum/permission/reply/like/notification/check-in integration.
- `pnpm audit --prod`: no known vulnerabilities. Prisma's vulnerable deepmerge-ts dependency is overridden to 8.x and Prisma generation has passed with that override.
- Browser: desktop page renders, search “Lanthanum” returns the exact project, 390px layout has no horizontal overflow, mobile menu expands.
- A separate MySQL 8.0.46 process runs on 127.0.0.1:13306 from a newly initialized temporary directory, never the existing MySQL80 service's data directory. The database is `lom_local_test`, containing only synthetic fixture data. Its schema synchronization was explicitly scoped to that empty local database. CI uses its own disposable `lom_ci_test` service; no schema synchronization is run against production.
- The browser production-build preview loads the real test forum post and correctly renders Chinese, Markdown, emoji and literal percent text. Synthetic-account login, reactive navigation, check-in state, editor source/preview compatibility, and light/dark homepage rendering passed. The editor's default CDN scripts were caught in browser QA and removed; all editor extension assets are local.
- Docker Desktop daemon was unavailable; `docker desktop start` and `docker info` did not finish, and these two command sessions were stopped. Do not claim the container build has passed until actually tested.
- Existing GitHub HEAD fb5885f is verified by GitHub API. New commit/signature/deployment still pending.

## Current processes

- Vite dev process session 46686 at `http://127.0.0.1:5173`.
- Backend preview process session 28051 at port 3000, test DB port 13306.
- Production Vite preview session 5574 at `http://127.0.0.1:4173`.
- Isolated MySQL process session 11299, data directory `C:\Users\yklom\AppData\Local\Temp\lom-mysql-test-c00778c409174aa8a11982d030fedec9`. Shut it down only through explicit `mysqladmin --no-defaults --protocol=TCP --host=127.0.0.1 --port=13306 --user=root shutdown`, not the existing MySQL80 Windows service. Leave the temporary directory until its contents are no longer needed.
- These session ids may expire between runs: verify ownership/status before reuse. Do not start duplicate services on the same ports.

## Next

1. Finish browser navigation/theme and production-build preview checks, format changed files, inspect final diff and dependency audit.
2. Complete local container/isolation checks if Docker can become available without authentication or accepting terms; otherwise document the concrete limit and continue safe tests.
3. Make a signed local commit. Push a verified batch only when the required local checks are satisfactory; observe deploy.yml and verify live health revision and UI.
4. Later batches: auth expiry vs permission errors/network failures, server-owned check-in-day handling, editor modernization, accessible content routes, safe database baselining with backup-first manual steps, further framework major upgrades with migration tests.

No production schema changes or migration SQL have been introduced in this batch.
