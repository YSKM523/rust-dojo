# Task 3 report — Rust page shell + resources SSR

## Outcome

- Added native-testable `askama` and `pulldown-cmark` ordinary dependencies; the existing target-specific `worker` and exact `wasm-bindgen = "=0.2.105"` pins are unchanged.
- Added `pages::content` with `include_str!("../../site-content.json")`, `OnceLock`, exact `resources` group deserialization, and GFM markdown rendering (tables, footnotes, strikethrough, task lists, and pulldown-cmark GFM extensions).
- Added Askama `base.html`, `topbar.html`, `resources_index.html`, and `resource_detail.html`, migrated node/class structure from the named TSX sources, and kept every Tailwind class literal (no data-built or fragment-built class names).
- Added native render view models and `GET /resources`, `GET /resources/:id` Worker routes while preserving all existing `/api/*` dispatch.
- Added Wrangler assets directory exactly as `{ "assets": { "directory": "../../assets-dist" } }`, with no binding.
- After live integration exposed the public-path mismatch, applied the coordinator-approved minimal Task 2 integration: the existing pipeline now cleans all of `assets-dist` and emits its unchanged CSS/islands/variable fonts beneath `assets-dist/assets/`; CSS font URLs match `/assets/fonts/...`.
- No deployment or migration-routing change was performed.

## Source-of-truth review

Read before implementation: Task 3 brief, global constraints, spec §4, all three island mount-protocol headers, `app/layout.tsx`, `components/Topbar.tsx`, `components/ThemeToggle.tsx`, `components/EditorialPanel.tsx`, both resources page TSX files, `components/LessonView.tsx`, the generated JSON schema, and the existing Worker route/assets code.

## TDD evidence

### Content parser / markdown RED

Command: `cd workers/api && cargo test --test content`

Observed before adding production page code:

```text
error[E0433]: failed to resolve: could not find `pages` in `rust_dojo_api`
 --> tests/content.rs:1:20
1 | use rust_dojo_api::pages::content::{render_markdown, site_content};
error: could not compile `rust-dojo-api` (test "content") due to 1 previous error
```

After the minimal parser was added, the table assertion caught an incomplete GFM option set:

```text
running 2 tests
test markdown_renderer_supports_gfm_tables_and_headings ... FAILED
assertion failed: html.contains("<table>")
test result: FAILED. 1 passed; 1 failed
```

The minimal fix explicitly enabled tables/footnotes/strikethrough/task lists alongside `ENABLE_GFM`. GREEN:

```text
running 2 tests
test markdown_renderer_supports_gfm_tables_and_headings ... ok
test generated_site_content_deserializes_with_all_modules ... ok
test result: ok. 2 passed; 0 failed
```

### Page renderer RED/GREEN

Before adding `pages::resources`:

```text
error[E0432]: unresolved import `rust_dojo_api::pages::resources`
 --> tests/content.rs:2:27
error: could not compile `rust-dojo-api` (test "content") due to 1 previous error
```

After the Askama renderers/templates:

```text
running 4 tests
test markdown_renderer_supports_gfm_tables_and_headings ... ok
test generated_site_content_deserializes_with_all_modules ... ok
test resource_detail_renders_markdown_inside_the_lesson_container ... ok
test resources_index_renders_the_page_shell_and_group_content ... ok
test result: ok. 4 passed; 0 failed
```

### Assets integration RED/GREEN

First live Wrangler run, before the approved public-tree adjustment:

```text
HTTP/1.1 200 OK  /resources
HTTP/1.1 200 OK  /resources/jd-ownership
HTTP/1.1 404 Not Found  /assets/site.css
HTTP/1.1 200 OK  /api/auth/me
{"user":null}
```

This proved the Worker routes and API coexistence but also proved that root-level `assets-dist/site.css` could not satisfy the required `/assets/site.css` URL. After emitting the whole public tree under `assets-dist/assets/`, the final live assertion printed:

```text
FINAL LIVE: id=jd-ownership /resources=200 /resources/jd-ownership=200 /assets/site.css=200 /api/auth/me=200 body={"user":null}
```

The live HTML assertions also matched the title, `岗位场景 / Scenarios`, `JD 能力对照清单`, `返回资料库`, and the LessonView prose container.

## Final validation

- `cd workers/api && cargo test`: 20 existing unit tests + 4 Task 3 integration tests passed; doc tests 0 failed.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0, no warnings/errors.
- Node 22.22.2 `npm run assets`: exit 0; pipeline self-check 16/16; `assets-dist/assets/site.css` 34,978 bytes and contains migrated template selectors.
- Clean-tree asset inspection: only the `assets/...` public subtree was generated; `NO_API_PATH` confirmed no `api/` directory/path exists.
- Final Wrangler live checks: both SSR routes, `/assets/site.css`, and `/api/auth/me` returned 200; API body remained exactly `{"user":null}`.
- `git diff --check`: clean.

## Self-review

- Re-read the task diff against all required files and verified no production deployment, routing cutover, package dependency/font-choice rewrite, or unrelated core formatting remains.
- Replaced conditional Tailwind class fragments with complete literal class attributes/branches; repository search finds no Askama expression embedded in a template `class` value.
- Confirmed the theme SVG protocol uses `data-island="theme-toggle"`; no SVG hiding uses the `hidden` class.
- Confirmed content lookup uses the committed top-level JSON key `resources` and detail markdown is only inserted through Askama `safe` after server-side pulldown-cmark rendering.
- Confirmed API match arms remain intact and precede the resource page arms.

## Fix round 1

### Reviewer findings addressed

- Restored the complete Topbar auth branch from `components/Topbar.tsx`: anonymous SSR renders the exact login anchor/classes; a verified `rdsess` cookie renders the email plus exact logout button/classes, and only one branch is emitted.
- Resource routes now read `SESSION_SECRET`, verify the existing signed session cookie through the existing `auth::read_session`/`core::session::verify_session` path, and pass the verified email into Askama.
- Added a framework-free logout island that preserves the React behavior: POST `/api/auth/logout`, ignore request failure, then navigate to `/`. Its three focused tests cover success ordering, failure navigation, and idempotent mounting.
- Kept the existing favicon head entry and extended the assets build to copy `app/favicon.ico` to `assets-dist/favicon.ico`; the build self-check now validates the generated file.
- Moved resource-body markdown rendering into `site_content()` initialization. Each `ResourceItem` caches `body_html` inside the `OnceLock`, and detail rendering borrows that cached HTML without per-request markdown parsing or cloning.

### Fix-round TDD RED evidence

Focused Rust command: `cd workers/api && cargo test --test content`

```text
error[E0609]: no field `body_html` on type `&ResourceItem`
error[E0061]: this function takes 0 arguments but 1 argument was supplied
  --> tests/content.rs:43:16
43 | let html = render_index(None)...
error[E0061]: this function takes 1 argument but 2 arguments were supplied
  --> tests/content.rs:64:16
64 | let html = render_detail("jd-ownership", None)...
error: could not compile `rust-dojo-api` (test "content") due to 5 previous errors
```

Focused island command: Node 22.22.2 `npm test -- islands/logout.test.ts`

```text
FAIL islands/logout.test.ts
Error: Failed to resolve import "./logout" from "islands/logout.test.ts". Does the file exist?
Test Files 1 failed (1)
```

Focused favicon integration RED after a clean assets rebuild:

```text
[assets] self-check: 16/16 passed
test -s assets-dist/favicon.ico exit=1
```

### Fix-round GREEN evidence

Focused Rust rerun:

```text
running 6 tests
test generated_site_content_pre_renders_resource_markdown ... ok
test resources_index_renders_authenticated_email_and_logout ... ok
test resources_index_renders_the_page_shell_and_group_content ... ok
test result: ok. 6 passed; 0 failed
```

Focused island rerun:

```text
Test Files 1 passed (1)
Tests 3 passed (3)
```

Assets rebuild:

```text
[assets] js: fx.js, logout.js, progress-badge.js, theme.js
[assets] favicon: app/favicon.ico -> assets-dist/favicon.ico
PASS favicon.ico 存在 (6103 B)
[assets] self-check: 19/19 passed
NO_API_PATH
```

### Fix-round full verification

- `cd workers/api && cargo test`: 20 existing unit tests + 6 Task 3 integration tests passed; 0 failures.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0 with no warning/error.
- Node 22.22.2 full `npm test`: 40 files passed, 1 skipped; 155 tests passed, 61 skipped.
- Node 22.22.2 `npm run assets`: self-check 19/19, favicon 6,103 bytes, logout island emitted, and no `api/` path.
- Fresh Wrangler checks with a test-only `SESSION_SECRET`:

```text
LIVE FIX: anonymous=200 detail=200 css=200 favicon=200 logout_js=200 api=200 auth=200 body={"user":null} favicon_bytes=6103
```

  Anonymous HTML contained the login anchor and no logout island. A valid signed test cookie produced `signed@example.com` plus the logout island and no login anchor. Both resources pages retained their required title/DOM assertions. Wrangler was stopped after the checks.

### Fix-round self-review

- HEAD remained the original Task 3 commit `2013d9b`, so the verified fix is eligible to amend that commit without crossing parallel work.
- No Tailwind class contains an Askama expression; Topbar branch classes remain complete literals.
- Session verification reuses the existing cookie name, secret binding, signature verifier, and expiration enforcement; raw cookie data is never rendered.
- The favicon copy is inside the existing full `assets-dist` clean/rebuild lifecycle, so stale files cannot satisfy its self-check.

## Fix round 2

### Whole-branch findings addressed

- Wrangler’s custom build now runs `npm --prefix ../.. run assets` before the unchanged `cargo install -q worker-build@0.1.14 && worker-build --release`. The command contains no PATH override, keeps `assets.directory` exactly `../../assets-dist`, and still has no assets binding.
- Raw pulldown-cmark `Event::Html` and `Event::InlineHtml` events are converted to text before `push_html`, so raw markup is escaped while normal markdown/GFM output remains enabled.
- `GET /resources/` now shares the exact index route arm with `GET /resources` instead of becoming an empty resource ID.

### Security TDD RED/GREEN

Focused RED command: `cd workers/api && cargo test --test content markdown_renderer_escapes_raw_html`

```text
running 1 test
test markdown_renderer_escapes_raw_html ... FAILED
assertion failed: !html.contains("<script>")
test result: FAILED. 0 passed; 1 failed
```

Focused GREEN command: `cd workers/api && cargo test --test content markdown_renderer`

```text
running 2 tests
test markdown_renderer_escapes_raw_html ... ok
test markdown_renderer_supports_gfm_tables_and_headings ... ok
test result: ok. 2 passed; 0 failed
```

The regression requires `&lt;script&gt;alert('xss')&lt;/script&gt;` and rejects an executable `<script>` tag; the existing table/heading/strikethrough test proves GFM behavior remains GREEN.

### Clean custom-build proof

The existing ignored output was moved, not deleted, to the recoverable backup:

```text
ASSETS_BACKUP=/tmp/rust-dojo-task3-assets.PvusYI/assets-dist
WORKSPACE_ASSETS_DIST=absent
```

An initial probe correctly recreated assets and passed its 19/19 checks, but my test invocation had replaced PATH instead of extending it, so the inherited Cargo path was absent and the later Cargo step exited 127. I kept that regenerated tree recoverably at `/tmp/rust-dojo-task3-assets.YSglHn/assets-dist`, returned the workspace to an absent-assets state, and repeated with Node prepended to the existing PATH:

```text
/home/ubuntu/.nvm/versions/node/v22.22.2/bin/node
/home/ubuntu/.cargo/bin/cargo
[custom build] Running: npm --prefix ../.. run assets && cargo install -q worker-build@0.1.14 && worker-build --release
[custom build] [assets] self-check: 19/19 passed
[custom build] Finished `release` profile [optimized]
[wrangler:info] Ready on http://localhost:8788
```

Wrangler performed its normal initial build plus one source-change restart, then reached a stable Ready state; no build/watch loop continued. The recreated output was served successfully:

```text
CLEAN LIVE: resources=200 slash=200 detail=200 css=200 favicon=200 api=200 body={"user":null} css_bytes=35165
```

`/resources` and `/resources/` were byte-identical (`cmp -s`), `/assets/site.css` came from the newly recreated tree, and Wrangler was stopped afterward.

### Fix-round 2 full verification

- `cd workers/api && cargo test`: 20 existing unit tests + 7 Task 3 integration tests passed; 0 failures.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0 with no warning/error.
- Node 22.22.2 full `npm test`: 40 files passed, 1 skipped; 155 tests passed, 61 skipped.
- Node 22.22.2 `npm run assets`: self-check 19/19; `assets/site.css` 35,165 bytes; favicon 6,103 bytes.
- Generated-tree inspection: `NO_API_PATH`.
- Fresh live assertions covered `/resources`, `/resources/`, `/resources/jd-ownership`, `/assets/site.css`, `/favicon.ico`, and `/api/auth/me` exact `{"user":null}`.

### Fix-round 2 self-review

- HEAD remained the Task 3 commit `3596c67`; no parallel commit is being crossed by the amend.
- The four-file fix scope is limited to Wrangler build orchestration, markdown event filtering/test coverage, trailing-slash routing, and this report.
- The custom build uses relative paths from `workers/api`, inherits both Node and Cargo PATH entries, retains the exact assets directory/no-binding contract, and does not change Worker pins.
- Raw HTML is escaped before the Askama `safe` insertion point; only server-generated pulldown HTML remains trusted.

DONE

## Fix round 3

### Reviewer findings addressed

- All SSR page responses, including HTML 404s, now pass through one `html()` builder with `Cache-Control: private, no-store`, `Vary: Cookie`, and the requested status code.
- Page dispatch accepts `GET | HEAD`. Non-API page paths use a native-testable renderer; `/api/*` misses retain the existing JSON 404.
- Resource detail parsing uses `strip_prefix("/resources/")` exactly once. A repeated embedded prefix therefore remains part of the id and misses instead of resolving a real resource.
- Added a minimal Askama `not_found.html` that extends `base.html`, renders `页面不存在`, and links to `/`; unknown page/resource paths return it with status 404.
- The base head now matches the three requested Next icon links. The assets build copies `favicon.ico`, `icon.png`, and `apple-icon.png` to the `assets-dist` public root and self-checks all three.
- All three Topbar nav links select between complete literal active/inactive class strings from the template `active: &'static str`; both resources templates pass `"resources"`, and the 404 passes `"home"`.
- Added `islands/progress-sync.ts`, which invokes the existing `bootstrapSync()` at module evaluation, and loaded `/assets/js/progress-sync.js` globally from `base.html`.

### TDD RED/GREEN evidence

The page-shell metadata regression first failed on the old favicon contract:

```text
test resources_index_renders_the_page_shell_and_group_content ... FAILED
assertion failed: html.contains("<link rel=\"icon\" href=\"/favicon.ico\" sizes=\"48x48\" type=\"image/x-icon\">")
```

The strict-routing tests failed before production code existed:

```text
error[E0432]: unresolved import `rust_dojo_api::pages::resources::render_page`
```

The island module-load test likewise failed before its entry existed:

```text
FAIL islands/progress-sync.test.ts
Cannot find module '/islands/progress-sync'
```

Focused GREEN reruns:

```text
cargo test --test content: 9 passed, 0 failed
npm test -- islands/progress-sync.test.ts: 1 passed, 0 failed
```

The two requested Rust regressions assert that `/resources//resources/jd-ownership` is a 404 and that `/resources/nope` is an HTML 404 containing `页面不存在` and the home link.

### Final verification

- `cargo test`: 20 unit tests + 9 Task 3 integration tests passed; doc tests had 0 failures.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0, no errors or warnings.
- Node 22.22.2 full `npm test`: 41 files passed, 1 skipped; 156 tests passed, 61 skipped.
- Node 22.22.2 `npm run assets`: self-check 24/24; `progress-sync.js` and all three root icons exist.
- Generated JS inspection found exactly one file containing the progress-store key and exactly one shared chunk (`STORE_FILES=1 SHARED_CHUNKS=1`); both progress entries import that chunk, so no second store copy was bundled.

### Wrangler smoke

A fresh custom build reached `Ready on http://localhost:8788`; the local server was stopped after these checks:

```text
HEAD /resources                              200 text/html
  Cache-Control: private, no-store
  Vary: Cookie
GET /resources//resources/jd-ownership      404 text/html; contains 页面不存在
GET /resources/nope                         404 text/html; contains 页面不存在
GET /icon.png                               200 image/png (40461 bytes)
GET /apple-icon.png                         200 image/png (12770 bytes)
GET /api/nope                               404 application/json; {"error":"not found"}
```

### Fix-round 3 self-review

- Rechecked all seven findings against the diff: no API success route changed, and API misses still use `json(404, ...)`.
- No Askama expression appears inside any template `class` attribute; active/inactive Tailwind strings are complete literals in separate branches.
- Icon paths correspond to the configured `assets-dist` public root, so `/icon.png` and `/apple-icon.png` are served without an `/assets/` prefix.
- Page 200 and page 404 responses share the same privacy headers; live HEAD behavior is delegated to workerd after the normal renderer runs.

DONE
