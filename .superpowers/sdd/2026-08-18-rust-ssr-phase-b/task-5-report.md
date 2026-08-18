# Task 5 report — Rust SSR learn pages

## Outcome

- Added native-testable Askama renderers for `/learn`, `/learn/`, and `/learn/:moduleId`, with strict one-time `/learn/` prefix removal and the existing HTML 404 contract.
- Extended the `include_str!` site-content model with module lesson/tier metadata, exercise module/difficulty metadata, and project roadmap metadata. Module lesson markdown is sanitized and rendered once during `OnceLock` initialization.
- Migrated the `/learn` roadmap and module detail DOM/classes node-by-node from the named TSX sources. All tier color classes are complete literals in template branches; no Tailwind class is dynamically assembled.
- Preserved roadmap ordering: each module is followed by projects whose `afterModuleId` points to it, with unmatched projects appended.
- Extended the existing `progress-badge` island protocol for exercise-row completion state and project-card progress while continuing to import the original `lib/progress/store.ts`. No new island entry or store copy was added.
- Routed only `/learn`, `/learn/`, and `/learn/*` to the learn renderer. All page responses still use the shared HTML response builder and its `Cache-Control: private, no-store` / `Vary: Cookie` headers; API dispatch remains ahead of page dispatch.

## TDD evidence

Rust RED before `pages::learn` existed:

```text
error[E0432]: unresolved import `rust_dojo_api::pages::learn`
could not find `learn` in `pages`
error: could not compile `rust-dojo-api` (test "content")
```

Island RED before extending the mount protocol:

```text
islands/progress-badge.test.ts (2 tests | 2 failed)
Expected [data-exercise-difficulty] to have attribute hidden
Expected project progress width 50%; received 0%
```

Focused GREEN:

```text
cargo test --test content: 13 passed, 0 failed
npx vitest run islands/progress-badge.test.ts: 2 passed, 0 failed
```

The Rust regressions cover eight module progress roots, m1 lesson heading/server-rendered markdown, exercise completion mount attributes, unknown-module HTML 404, active learn navigation, and one-time prefix stripping.

## Assets and client protocol

- Node 22.22.2 `npm run assets`: self-check 24/24 passed.
- `assets-dist/assets/site.css` contains `.bg-emerald-700`, `.bg-sky-700`, `.bg-violet-700`, `.bg-amber-700`, `.bg-brand`, and both learn-page arbitrary grid selectors.
- The generated entries remain `fx.js`, `logout.js`, `progress-badge.js`, `progress-sync.js`, and `theme.js`, plus one shared chunk; generated JS contains no React runtime.
- Module cards SSR as `0 / total 通关`, project cards as `0 / total 已验收`, and exercise rows as difficulty labels. The existing island immediately paints local progress and subscribes to later store changes.

## Final validation

- `cd workers/api && cargo test`: 20 unit tests + 13 integration tests passed; doc tests had 0 failures.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0, no errors.
- Node 22.22.2 full `npm test`: 42 files passed, 1 skipped; 158 tests passed, 61 skipped.
- `worker-build --release`: exit 0; optimized wasm package and Worker shim built successfully.
- `git diff --check`: clean.
- Only task-owned Rust files were formatted; unrelated pre-existing formatting differences were not rewritten.

## Wrangler smoke

The repository Wrangler custom build repeats `cargo install worker-build@0.1.14`, which cannot write the sandbox's read-only `~/.cargo/.crates.toml`. The pinned binary was already installed, so the smoke used its fresh `worker-build --release` output and a temporary `/tmp` Wrangler config with the same main module/assets directory. Wrangler runtime logs and registry were also directed to `/tmp`; no repository config or pin changed.

The local Worker reached `Ready on http://localhost:8791`, then passed:

```text
GET  /learn       200; expected title and data-module-id="m8"
GET  /learn/m1    200; <h2>起步与所有权</h2> and data-exercise-id="m1-01"
GET  /learn/nope  404 text/html; contains 页面不存在
HEAD /learn/m1    200 text/html
Cache-Control: private, no-store
Vary: Cookie
```

The local Worker was stopped and the temporary config removed after the checks.

## Self-review

- Re-read the task diff against the source TSX components, `lib/tier.ts`, the site-content JSON shape, and the existing resource renderer/router patterns.
- Confirmed valid learn pages pass `active: "learn"`; the shared 404 passes `active: "home"` as in the existing page pattern.
- Confirmed lesson HTML reaches Askama `safe` only after the existing markdown renderer escapes raw HTML.
- Confirmed the exercise completion protocol toggles SVG visibility via the `hidden` attribute, not a Tailwind `hidden` class.
- Confirmed no `class` attribute contains an Askama-generated class value or a dynamically concatenated Tailwind fragment.
- No deployment, production migration, dependency pin, generated content, or unrelated application code was changed.

DONE
