# Task 10 report — Rust SSR login and me pages with auth islands

## Outcome

- Added native-testable Askama renderers and templates for `/login` and `/me`, then registered both handlers in the existing ordered `PAGE_ROUTES` table before the `/` resources fallback.
- Kept the mature Worker response contract unchanged: non-API `GET | HEAD` requests use the shared `html()` exit with `Cache-Control: private, no-store`, `Vary: Cookie`, and HTML 404 rendering.
- Both page handlers use one `strip_prefix` operation and accept only the exact path plus one optional trailing slash. Descendants and duplicated prefixes render the shared HTML 404.
- Ported both TSX pages node-by-node through the existing `base.html`, `topbar.html`, and expanded `EditorialPanel` structure. All original Tailwind class strings remain literal.
- Added `/assets/js/login.js` and `/assets/js/me.js` to the shared shell. The existing asset builder discovers both entries automatically; no dependency, pin, or asset script change was needed.

## Login behavior

`islands/login.ts` documents and implements the template mount protocol. The SSR template emits only the React email-step DOM; the island replaces the current form when the step changes, so no hidden code form or hidden alert adds nodes to the initial tree.

Behavior remains aligned with `app/login/page.tsx`:

- Email is validated with the original empty/format messages, then trimmed and lowercased for `POST /api/auth/request-code`.
- There is no countdown because the source page has none. Busy state only disables the primary button and changes its original text to `发送中…` / `验证中…`.
- The code step shows the current raw email state, trims only the code, does not add a six-digit/numeric validator, and posts normalized credentials to `/api/auth/verify`.
- Non-2xx responses display the API `error` field verbatim, with the original fallback copy; fetch or JSON failures use `网络错误，请重试`.
- Successful verification uses `window.location.assign('/me')`.
- “换个邮箱” preserves the email, clears code/error, and remains usable while verify is pending exactly like the React button. The current form continues reflecting the shared busy state until that request settles.
- Delegated input handling preserves React controlled-state behavior when a user edits the email during an in-flight request. Cleanup invalidates pending post-await DOM changes and navigation.
- All dynamic email/error text is assigned with `textContent` or `value`; it is never interpolated into HTML.

## Me behavior and auth decision

The Rust template server-renders all eight module rows from `site_content()` with the same order, titles, links, initial `0 / total` counts, and 0% bars as React's empty server snapshot. It exposes all 60 exercise IDs plus per-module IDs through documented `data-*` attributes.

`islands/me.ts` reuses the original `lib/progress/store.ts` singleton. It paints immediately, subscribes to future changes, counts only known exercise IDs (not project/unknown IDs), uses the original rounded percentage formula, and reproduces the clear/cancel/confirm DOM states and classes.

The page-level login message intentionally remains client-driven through `GET /api/auth/me`, matching `useSession()` including anonymous fallback on request/JSON failure. Existing `session_email` SSR is used only by the shared Topbar. The Topbar logout button remains owned by the mature `islands/logout.ts`; `me.ts` neither duplicates the button nor registers a second handler. Logout therefore continues to POST `/api/auth/logout` and navigate to `/` even when the request fails.

Topbar active behavior follows the exact source predicate: `/me` is active, while the accepted `/me/` variant is not (`pathname === '/me'`, not a prefix predicate). `/login` has no active navigation item.

## TDD evidence

Initial Rust RED:

```text
error[E0432]: unresolved import `rust_dojo_api::pages::login`
error[E0432]: unresolved import `rust_dojo_api::pages::me`
```

Initial island RED:

```text
Failed to resolve import "./login" from "islands/login.test.ts"
Failed to resolve import "./me" from "islands/me.test.ts"
```

Two state-race regressions were also observed failing before their fixes:

```text
Expected destination Latest@Example.COM; received first@example.com
Expected email form after clicking 换个邮箱 during verify; received null
```

Review regressions failed before fixes for `/me/` incorrectly using the active class and for an in-flight login request replacing the form after cleanup. Focused final GREEN was 14/14 island tests and 23/23 Rust content integration tests.

Rust integration tests cover SSR 200 status, trailing-slash behavior, strict descendant/duplicated-prefix HTML 404s, title and critical DOM, all eight module mounts, the 60-question summary, session ownership, and exact Topbar classes. Native integration cannot instantiate Worker `Request` because routes and the `worker` dependency are wasm-only; real HEAD/header behavior is covered by the Wrangler gate below rather than a source-string pseudo-test.

## Final validation

- Node `v22.22.2` `npm run assets`: self-check **30/30 passed**; `login.js` and `me.js` exist, every JS entry/shared chunk is React-free, and the progress store remains in one shared chunk.
- `cargo test`: **20/20 unit + 23/23 integration**, doc tests 0 failures.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0, no errors.
- `worker-build --release`: exit 0; the latest optimized wasm/shim built successfully.
- Node `v22.22.2` full `npm test`: **46 files passed, 1 skipped; 199 tests passed, 61 skipped**.
- Targeted ESLint for both new islands and tests: exit 0.
- `git diff --check`: clean before report/commit preparation.
- Independent read-only code review after fixes: no Critical or Important findings; verdict **Ready to merge: Yes**.

## Wrangler smoke

Wrangler `4.100.0` ran the freshly built Worker on `127.0.0.1:8791` with repository assets and local bindings. A temporary `/tmp` config omitted only the repository build hook because `worker-build --release` and assets had already run freshly; it was deleted after shutdown.

```text
GET  /login           200 text/html; default title + email form + email ARIA/placeholder
GET  /me              200 text/html; default title + 0 / 60 overview + 8 module rows
GET  /me/             200 text/html; 我的足迹 correctly inactive
HEAD /login           200 text/html; Cache-Control private,no-store; Vary Cookie
HEAD /me              200 text/html; Cache-Control private,no-store; Vary Cookie
GET  /login/nope      404 text/html; 页面不存在
GET  /me/nope         404 text/html; 页面不存在
GET  /task10-unknown  404 text/html; 页面不存在
GET  /api/nope        404 application/json; {"error":"not found"}
```

Wrangler was shut down normally. No production deployment or main-worker cutover was performed; those remain orchestrator-owned under the phase constraints.

## Parallel isolation

- Did not edit `components/**`, `islands/fx.ts`, or `islands/fx.test.ts`.
- Preserved the unrelated pre-existing `task-6-report.md` modification and concurrent Task 8 working-tree changes.
- Commit staging uses only the explicit Task 10 paths listed in the final commit; no `git add -A` or broad pathspec is used.

DONE
