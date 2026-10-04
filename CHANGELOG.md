# Changelog

## 2.0.19 — 2026-10-04

- Scope personal profile loading and editor operations to the active route, login and component, including logout/return. Clear private drafts when the context changes and show a retryable read error instead of editable empty fields.
- Lock profile/password submissions before asynchronous validation, preserve existing validation/credential rules and suppress late feedback after navigation or unmount. Update only the current member's submitted profile fields after a successful save; server requests already sent are not represented as canceled.
- Bind actual avatar upload finish/remove events and preview the current draft. Preserve the server's exact timestamp/Unicode/literal-percent filename and raw URL. Separate in-flight upload state from attachment-list readiness so existing avatars need no synthetic file id or new mapping; removing a draft never deletes stored uploads.
- Refresh the responsive settings layout with named inputs, native 44px controls, readable loading/retry states and reduced-motion support. Add 26 frontend tests, including real Naive UI buttons/uploads, and pass full local test/lint/build/audit/read-only smoke and production-build page acceptance. No dependency, database schema or stored upload changes.

## 2.0.18 — 2026-10-04

- Repair the personal profile's activity source with bounded, authenticated-member-only reads and actual chronological ordering; preserve Unicode reply previews. Profile and activity responses are no-store, without schema or data changes.
- Guard profile/achievement reads across login transitions and logout/return, share overlapping achievement requests and expose retryable errors without false zero/empty results. Keep asynchronously refreshed profile achievements/statistics reactive and use real edit/activity links.
- Synchronize persisted credentials before synchronous login watchers run. Use in-memory request-generation guards so an old 401 cannot expire a returned identical token; no extra credentials, headers or persisted session mapping are introduced.
- Refresh the profile's theme-aware cards and readable locked achievements. Native edit/activity/retry links and buttons have visible focus and at least 44px targets; frame animations respect reduced-motion preferences. Existing achievement/frame thresholds are unchanged.
- Add 25 frontend/backend tests and pass full local tests, zero-warning lint, production build/audit/read-only smoke and actual member-switch, read-error/retry, keyboard and 390px layout acceptance. No schema, stored upload, filename or timestamp changes.

## 2.0.17 — 2026-10-04

- Add a local-only building-material planner with exact per-row full stacks, remainder and storage-slot counts. Explicit stack sizes and user-selected container capacity avoid guessing item or server rules; rows are not silently merged and zero amounts do not invent a final container.
- Link the public tool from the homepage and coordinate utility. Use a responsive, theme-aware layout, native labeled controls, bounded input and an accessible storage diagram. Invalid input clears old results; Unicode and literal percent text remain unchanged.
- Provide precise clipboard text, a readonly manual-copy fallback and overlap/edit/unmount guards. Inputs are neither saved nor uploaded. Homepage bottom links receive 44px targets.
- Add 44 calculation/component tests and complete full local test/build/lint/audit/read-only smoke and desktop/mobile/keyboard/clipboard acceptance. No new dependencies, database, uploaded file, filename or timestamp changes.

## 2.0.16 — 2026-10-04

- Prevent overlapping post creation and stale post/article/reply submission or feedback after cancellation, unmounting or login changes. Preserve existing validation and capture attachment arrays; requests already sent are not represented as undone.
- Keep member-region reads scoped to the current form/session. Unmount closed post/article forms and close them on account, permission or list-visit changes. Normal same-member profile refreshes preserve the draft; reopened forms start fresh.
- Disable content submission while attachments are in flight, including uploads that start during asynchronous validation. Ignore removed, old-session and unmounted upload completions without deleting already stored files.
- Use the current upload component's existing file id and documented finish/remove events. Display the exact server-stored timestamp filename, preserve Unicode/literal-percent names and raw attachment URLs, and remove only the selected draft reference. No persistent filename mapping or additional transcoding.
- Scope community-list deletion confirmations to the current visit/member/permissions, destroy only owned stale dialogs and prevent repeated callbacks. Author/admin and backend rules remain unchanged.
- Add 58 frontend regressions, including actual Naive UI button/upload semantics. Full tests, lint, build, audit, read-only smoke and non-mutating browser form/navigation/mobile checks pass. Direct browser file selection remains limited by disabled Chrome extension file-URL access; actual component and multipart/disk/read tests pass. No production database, stored upload, filename or timestamp changes.

## 2.0.15 — 2026-10-04

- Keep notification content and unread counts scoped to the current login session. Clear private state on account changes/closing, ignore stale results and stop polling on unmount; retain the original 30-second polling cadence without overlapping requests.
- Bind API authorization synchronously to the session present when a request is initiated, instead of adopting a later login before the asynchronous interceptor runs. Preserve existing token expiry and same-session 401 handling; queue a fresh badge read when a read action finishes during an older poll.
- Refresh the badge immediately after login and successful read operations. Load an initially open drawer, distinguish failed reads from empty notifications and provide a visible retry.
- Use native, keyboard-operable notification buttons with visible focus, minimum 44px targets and a viewport-bounded drawer. Capture safe local destinations and suppress duplicate or stale mark-read/navigation operations.
- Mark authenticated notification reads no-store and verify actual MySQL member separation for reads, foreign-id mark-read attempts and mark-all operations. Notification creation, ownership, existing API responses, database schema and uploads remain unchanged.

## 2.0.14 — 2026-10-04

- Reload reused forum/article detail components when their route id changes. Ignore late reads and errors from previous routes, visits and unmounted components; do not fetch unrelated routes while navigating away.
- Keep the newest reply page, reset pagination for a new parent post and expose loading/retryable errors without presenting a failed request as an empty discussion. Retain existing replies during a failed refresh.
- Capture edit payloads and deletion identities. Destroy each detail's own old confirmation on navigation/session changes; ignore stale mutation feedback and prevent duplicate confirmation/save requests. Existing author/admin rules and server-side permissions remain unchanged.
- Scope reply validation/submission and member-region results to the current form, parent and login session. Closing or replacing the form cannot submit after late validation or update a new page after a late response. Already-sent requests are not represented as canceled or undone.
- Add detail state-race, real-router reuse and reply-form regressions, plus manual-copy feedback for unavailable article clipboard access. No database schema, uploads, filename or timestamp changes.

## 2.0.13 — 2026-10-04

- Add a locally computed Minecraft coordinate tool linked from the homepage server card: exact 8:1 Overworld/Nether X/Z conversion, source-dimension chunk indices, 0–15 local positions and block ranges.
- Handle negative coordinates with mathematical floor division and preserve fractional portal coordinates instead of silently rounding. Validate integer input and supported calculation bounds; expose server/custom-ratio/portal-pairing limitations and primary rule references.
- Use a theme-aware responsive layout, native labeled controls, precise clipboard text, manual-copy fallback and an accessible chunk map. No login, coordinate storage, game-server connection or new dependencies.
- Add coordinate-boundary/property and UI/clipboard regression tests. Existing database data, upload names, timestamps and business permissions are unchanged.

## 2.0.12 — 2026-10-04

- Coalesce like-count and personal-status reads across cards in the same render burst, instead of sending separate requests per card. Deduplicate identities and split batches at 100 items; retain no response cache.
- Check the current login session both before sending and after receiving personal status. Previous-session results remain unable to change the current buttons; anonymous visitors read only public counts.
- Add a bounded public count endpoint backed by one grouped query on the existing like index. Validate both batch endpoints and mark personal responses no-store. Existing single-item APIs, toggle behavior and notifications remain unchanged.
- Cover component/transport races, invalid input, authentication and actual MySQL count/member separation. No schema migration or upload/filename changes.

## 2.0.11 — 2026-10-04

- Prevent late initial like reads from overwriting successful toggles. Reload when the entity or login session changes, ignore stale/unmounted results and errors, and preserve overlapping-click protection and existing like rules.
- Restore search, pagination and scroll through detail-page return buttons when the previous route is the matching list. Direct links and unrelated/external history use the ordinary local list fallback; no extra filename or navigation-state mapping is added.
- Give appearance switches explicit accessible names. Use keyboard-operable color buttons with pressed state, visible focus and 44px targets, and respect reduced-motion preferences.
- Add focused state-race, safe-navigation and actual switch-semantics regressions. No database schema, reward, upload or filename changes.

## 2.0.10 — 2026-10-04

- Fix avatar frames that never updated after a response slower than 100ms. Apply the actual asynchronous result, with guards for member changes and component unmounting.
- Share public frame reads across avatar instances, deduplicate member ids and respect the existing 100-member request limit. Use a bounded, short-lived cache; failures and malformed responses stay retryable.
- Keep backend achievement/frame rules unchanged. Give decorative avatars explicit empty descriptions, defer offscreen images and prevent repeated fallback-image errors; respect reduced-motion preferences.
- Regressions reproduced both the slow-response bug and duplicate requests before the fix. No database, upload or filename changes.

## 2.0.9 — 2026-10-04

- Redesign community and announcement lists with the homepage's editorial, charcoal/lime visual language, theme-aware surfaces, responsive layouts and shared components. Preserve all existing content and author/admin permissions.
- Use real detail links for keyboard navigation, opening new tabs and link sharing. Keep like/delete controls outside navigation links, provide explicit labels and avoid cutting an emoji in a content preview.
- Store search, page and page-size state in ordinary URL queries. Refreshing, sharing and browser back/forward restore the current list; typing is debounced without filling browser history. Literal percent sequences and Unicode remain unchanged after the router's transport decoding.
- Keep retry/empty/error behavior, preserve unrelated query parameters and cancel pending search navigation when leaving the page. No database or upload changes.

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
