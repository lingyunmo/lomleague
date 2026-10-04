# lomleague ongoing modernization

## Scope and invariants

- Work only in `E:\ClaudeCode\lomleague`; do not rescan D: or E:.
- Keep the local Git identity and SSH commit signing configuration.
- Upload filenames retain the existing timestamp prefix and original readable name. Do not introduce a UUID/original-name mapping or decode percent sequences in multipart filenames.
- Do not reset databases, run destructive schema synchronization against production, recreate MySQL, remove volumes, or remove existing uploads.
- Batch local tests and builds before pushing. Verify Actions, the commit signature, and the live page after release.
- The indefinite goal remains active. A thread heartbeat named “lomleague 持续重构与发布” runs every 30 minutes. It requires the desktop app and host to remain running; quota availability still governs execution.

## Working batch: 2.0.9 (not yet released)

- Version 2.0.8 is released: GitHub-verified commit c978be7db85caff4748f36067358998dead97aae, successful Actions run 37179993982 and matching live health/footer. The actual green Verified badge was checked in the browser; the new Node 24 actions passed real CI/container deployment. Screenshot: lomleague-2.0.8-homepage.jpg in the task output directory.
- Community and announcement lists share a responsive, theme-aware editorial shell and entries. Detail navigation is now a real link, with separate actions and unchanged permissions.
- Search/page/size are restorable URL state, preserving literal percent/Unicode text and unrelated query parameters. Debounced typing replaces history; pagination pushes history, detail/back restores the list and pending search is canceled on navigation/unmount.
- Twenty-nine added frontend regressions passed. Full local checks passed: 196 tests (99 backend, 97 frontend), zero-warning lint, production build, production dependency audit and actual read-only smoke at local-preview-v2.0.9.
- Production-build browser QA passed desktop light/dark layout, 390px mobile layout without horizontal overflow, URL search/page/size identity, keyboard Enter navigation, browser-back restoration, original attachment filename display and the announcement page. Temporary viewport emulation was cleared. The old owned preview process had stopped and was replaced only after confirming its port was free; production was unaffected.

## Previous release batches

- Version 2.0.7 is released: GitHub-verified commit 735555c32974e9957703178215073e0bc26d6b0d, successful Actions run 37171774550, and matching live version/revision.
- The next batch fixes a reproduced pagination event bug (duplicate page updates, missing page/size payload), preserves search filters on pagination and retry, ignores stale asynchronous responses, and exposes loading/error/retry separately from empty lists.
- Unsuccessful likes now produce a safe user-facing message without logging raw request objects. Concurrent duplicate toggle calls are suppressed. Accessibility includes pressed state and list busy/error announcements.
- Existing pnpm setup and registry login actions are upgraded to official Node 24 releases. Unused code cleanup removes the twelve pre-existing lint warnings without changing business rules.
- Full local checks passed: 167 tests (99 backend, 68 frontend), zero-warning lint, production build and production dependency audit. The actual local read-only smoke reports 2.0.8 with local-preview-v2.0.8.
- Production-build browser QA confirmed literal percent search, distinct second-page results, page-size reset, a mounted search field during loading, and error/retry/empty distinctions. Only the owned local backend was stopped for the disconnect test; retry recovered after restarting it. No production writes were performed. The subsequent Actions/live checks confirmed the release, as recorded above.

- Version 2.0.6 is released: GitHub-verified commit 281c141815b40e0a61b97b7944fafc8bc6b0f905, successful Actions run 37171276211, and matching live health revision. The homepage screenshot is saved in the task output directory as lomleague-2.0.6-homepage.jpg.
- Next batch isolates uploaded active documents. Client MIME headers are not proof of content: an allowed image MIME can accompany an HTML filename. Uploaded non-PDF responses now use sandbox without scripts or same-origin access, while preserving downloads and same-path image/media requests. All uploads receive nosniff and no-referrer.
- Native PDF viewers use a separate frame-ancestor policy rather than document sandbox. Browser compatibility was checked against MDN and the Chromium PDF/CSP regression record, then verified in Chrome with a real local one-page fixture. A valid HTML test script did not execute, and the existing timestamp/Chinese/percent image still loaded at its original 580px width.
- Existing filenames, bytes, database rows and uploads are never renamed or removed. Full checks passed: 150 tests (99 backend, 51 frontend), lint without errors, production build, production dependency audit and actual local read-only smoke.

- Version 2.0.5 is released: GitHub-verified commit fb325af9a8d32be90b3609daf3c6e5449826bcdf, successful Actions run 37170920943, live health and footer match 2.0.5. The attachment/PDF batch did not change production schema or existing uploads.
- Next batch fixes a reproduced check-in race: twelve concurrent local requests originally granted five rewards. A conditional update on the existing last_checkin_date and a balance read within one transaction now grant only one reward. No new field, migration, timezone or reward-rule change.
- Three repeated real-MySQL integration runs passed both new-user and persisted-date/streak races; each 12-request race returned one success and eleven 409 conflicts. Unit regressions cover 5–12 coin rewards, streak reset/continuation and exact date guards. Full version-2.0.6 checks passed: 140 tests (89 backend, 51 frontend), lint without errors, production build, production dependency audit and actual local read-only smoke.

- Version 2.0.4 is released: signed commit d663cfecb1073f888d1c2452da9924a254a858e6, successful Actions run 37170314796, live /api/health reports the matching version and revision. The redesigned homepage and existing production forum links were verified in the browser.
- Next batch fixes attachment labels/download filenames that previously stripped the business timestamp or displayed URI escapes. URL segments alone decode once; no stored filename or database mapping changes.
- The frontend already advertised PDF uploads but both MIME filters rejected them. They now agree on application/pdf while preserving authentication, avatar restrictions and 10 MB limits. All 124 tests (73 backend, 51 frontend), lint (zero errors, 12 existing warnings), production build, production dependency audit and read-only local smoke passed.
- A real local HTTP upload of 中文论文100% %E4%B8%AD.png preserved its name plus the timestamp and returned identical bytes. Its synthetic forum post 13 renders the exact stored filename and image correctly in the production-build preview. Browser file-chooser upload itself remains unverified because the extension's local-file permission is off; do not change that permission or ask the sleeping user. Existing HTTP and component regressions cover transmission and callback/list identity.

- New responsive homepage, code-native isometric block world, searchable film/project/member archive, preserved historical records, check-in, and real cached Minecraft status.
- Vite 8, Vue and compatible dependency updates, Vitest 5, ESLint 10, Multer 2.4.
- Multer now parses ordinary filename headers as UTF-8. Manual latin1 round trips and incorrect URI decoding are removed; URLs alone encode path segments for transport.
- Linux import casing corrected. API misses return 404 instead of hanging. Health response contains version/revision.
- UI imports are tree-shaken, the old Markdown editor is replaced by locally bundled md-editor-v3 + DOMPurify and loaded asynchronously. Existing Markdown and safe HTML are covered by compatibility tests. Viewport/language/description metadata, mobile navigation and keyboard skip link are fixed.
- Workspace-lockfile Docker build on Node 24, secret/upload exclusions, immutable image tags, CI container smoke with a disposable database, server-side candidate preflight, app-only deployment, health gate and previous-image rollback; MySQL image/config/mount unchanged. Application startup no longer runs migration commands.

## Checks so far

- `pnpm build` passed repeatedly. `pnpm lint` has zero errors (13 existing warnings).
- `pnpm test` with `LOM_TEST_DATABASE_URL`: 100 passing tests (67 backend, 33 frontend), including real local HTTP multipart → filesystem → URL fixtures, status caching/failures, app health/API contracts, case-sensitive Git/filesystem imports, delivery invariants, read-only smoke contracts, archive search, Markdown sanitization, no remote editor asset injection, login-expiry/error/race regressions, and real MySQL registration/login/forum/permission/reply/like/notification/check-in integration.
- `pnpm audit --prod`: no known vulnerabilities. Prisma's vulnerable deepmerge-ts dependency is overridden to 8.x and Prisma generation has passed with that override.
- Browser: desktop page renders, search “Lanthanum” returns the exact project, 390px layout has no horizontal overflow, mobile menu expands.
- A separate MySQL 8.0.46 process runs on 127.0.0.1:13306 from a newly initialized temporary directory, never the existing MySQL80 service's data directory. The database is `lom_local_test`, containing only synthetic fixture data. Its schema synchronization was explicitly scoped to that empty local database. CI uses its own disposable `lom_ci_test` service; no schema synchronization is run against production.
- The browser production-build preview loads the real test forum post and correctly renders Chinese, Markdown, emoji and literal percent text. Synthetic-account login, reactive navigation, check-in state, editor source/preview compatibility, and light/dark homepage rendering passed. The editor's default CDN scripts were caught in browser QA and removed; all editor extension assets are local.
- The local Docker Desktop daemon remains unavailable; local container execution is unverified. Actual Linux Docker builds passed in CI for 2.0.2 and 2.0.3; the latter exposed a runtime workspace problem before publishing.
- Commit b784fdf (2.0.0) was signed with the existing local identity, pushed, and confirmed `verified: true` / `valid` by GitHub. Run 37168510408 rejected a Windows/Git case mismatch (`ArticleRoutes.js` in Git vs `articleRoutes.js` on disk), and deployment was skipped. The fix records a real case-only Git rename and makes the local import tests consult Git's canonical filenames as well as the filesystem.
- Commit 5f2dc5a (2.0.1) also has a valid GitHub signature. Run 37168651373 passed the import checks but exposed missing `JWT_EXPIRATION` in the disposable CI login fixture. The fixture now explicitly stubs 3600 seconds and asserts the token lifetime, so tests no longer accidentally depend on the local ignored `.env`. Deployment was skipped; production is still unchanged.
- Commit 77c8282 (2.0.2) is also GitHub-verified. Run 37168930554 passed all Linux checks and the Docker build but the production container restarted; the health gate rolled back to the previous image. The old public health endpoint returned 200 again. The exact startup error was not captured. The next batch adds a candidate-container preflight before replacement and removes automatic schema migration from app startup. Existing migration SQL is present in Git and has not been changed; the earlier filesystem-only inventory did not reveal it.
- Local next-batch auth fixes cover invalid JWTs, 403/network-error session preservation, same-token 401 expiry, stale requests, deduplicated profile loading and logout cache cleanup. They are not deployed yet.
- Commit 84ecee0 (2.0.3) is GitHub-verified. Run 37169585543 passed Linux tests and image building, then the new isolated-container gate exposed implicit pnpm installation from the obsolete nested backend workspace/lockfile. Publishing and server deployment were skipped, leaving the old app untouched. The four nested lockfile/workspace files and duplicate backend .npmrc are now removed (recoverable in Git), runtime workspace metadata/package links are complete, and the disposable CI schema setup invokes the installed Prisma CLI directly. Build-script approvals use pnpm 11's version-specific allowBuilds; stale dependencies now fail explicitly instead of triggering automatic installation.

## Current processes

- Vite dev process session 46686 at `http://127.0.0.1:5173`.
- Backend preview process session 88007 at port 3000, test DB port 13306, revision `local-preview-v2.0.9`. The actual read-only smoke script passed against it. The previous owned process session 70795 was stopped. Browser production-preview login/logout, attachment identity, active-document isolation, native PDF viewing, pagination, retry and restorable URL state passed.
- Production Vite preview session 44856 at `http://127.0.0.1:4173`. Previous owned session 5574 exited; its port was confirmed free before restart.
- Isolated MySQL process session 11299, data directory `C:\Users\yklom\AppData\Local\Temp\lom-mysql-test-c00778c409174aa8a11982d030fedec9`. Shut it down only through explicit `mysqladmin --no-defaults --protocol=TCP --host=127.0.0.1 --port=13306 --user=root shutdown`, not the existing MySQL80 Windows service. Leave the temporary directory until its contents are no longer needed.
- These session ids may expire between runs: verify ownership/status before reuse. Do not start duplicate services on the same ports.

## Next

1. Finish browser navigation/theme and production-build preview checks, format changed files, inspect final diff and dependency audit.
2. Complete local container/isolation checks if Docker can become available without authentication or accepting terms; otherwise document the concrete limit and continue safe tests.
3. Make a signed local commit. Push a verified batch only when the required local checks are satisfactory; observe deploy.yml and verify live health revision and UI.
4. Later batches: auth expiry vs permission errors/network failures, server-owned check-in-day handling, editor modernization, accessible content routes, safe database baselining with backup-first manual steps, further framework major upgrades with migration tests.

No production schema changes or migration SQL have been introduced in this batch.
