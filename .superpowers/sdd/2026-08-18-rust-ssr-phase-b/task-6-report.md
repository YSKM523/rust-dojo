# Task 6 report — Rust SSR project pages and checklist island

## Outcome

- Added native-testable Askama rendering for `/project/:id` and routed `/project/*` through the existing Worker HTML response path. Valid pages retain `Cache-Control: private, no-store`, `Vary: Cookie`, GET/HEAD handling, strict one-time `/project/` prefix removal, and the shared HTML 404 contract.
- Extended the generated content model with each project's `brief` and checklist item `text` / `testCommand` / `hint`. Project brief markdown is sanitized and rendered once during `OnceLock` initialization, then inserted into the exact `LessonView` prose container.
- Migrated the project page and `ProjectChecklist` DOM/classes node-by-node from `app/project/[id]/page.tsx`, `EditorialPanel`, `LessonView`, and `ProjectChecklist.tsx`. The Task 5 roadmap already contains the node-for-node `ProjectCard` migration, so it was reused without duplication.
- Added `islands/checklist.ts` with a file-header mount protocol. It hydrates from and subscribes to the original `lib/progress/store.ts`, sends checkbox changes through `markCompleted` / `unmarkCompleted`, and updates checkbox/label state, completed count, progress width, `aria-valuenow`, and the all-complete icon.
- Preserved the remaining React interactions: command copy with silent clipboard failure and a resettable 1600 ms success timer, plus hint toggle text, body visibility, and `aria-expanded`.

## Topbar active behavior

`components/Topbar.tsx` marks the learning link active only when `pathname.startsWith('/learn') || pathname.startsWith('/exercise')`. `/project/*` matches none of the three active predicates in the current site, so the Rust project template passes `active: "project"` and intentionally leaves every topbar link inactive. A Rust assertion guards the inactive `/learn` class and absence of its active class.

## TDD evidence

Initial Rust RED before the project renderer existed:

```text
error[E0432]: unresolved import `rust_dojo_api::pages::project`
could not find `project` in `pages`
```

Initial island RED before the entry existed:

```text
Failed to resolve import "./checklist" from "islands/checklist.test.ts"
```

The copy-timer parity review added a separate failing regression before its fix:

```text
checklist island > restarts the copy success timer after repeated clicks
Expected the element not to have attribute: hidden
```

Focused GREEN:

```text
cargo test --test content: 17 passed, 0 failed
npx vitest run islands/checklist.test.ts: 4 passed, 0 failed
```

Rust regressions render all four project ids, count all 43 checklist `data-id` attributes, assert a server-rendered p1 brief, verify the complete checklist/progressbar mount DOM, test unknown-id HTML 404, and guard strict prefix stripping.

## Assets and shared store

- Node 22.22.2 `npm run assets`: self-check 26/26 passed.
- Entries are `checklist.js`, `fx.js`, `logout.js`, `progress-badge.js`, `progress-sync.js`, and `theme.js`; all generated JS is React-free.
- esbuild produced exactly one shared file, `assets/js/chunks/chunk-2Y345PTY.js`. `checklist.js`, `progress-badge.js`, and `progress-sync.js` import that same chunk.
- The `rustdojo:completed` store signature occurs exactly once across all generated JS and only in that shared chunk, confirming a single cache/listener/store instance.
- Generated CSS contains the project page's `.7fr 1.3fr` grid, checkbox checkmark content, and line-through completion class.

## Final validation

- `cd workers/api && cargo test`: 20 unit tests + 17 integration tests passed; doc tests had 0 failures.
- `cargo clippy --target wasm32-unknown-unknown --all-targets`: exit 0, no errors.
- `worker-build --release`: exit 0; optimized wasm package and Worker shim built successfully.
- Node 22.22.2 full `npm test`: 43 files passed, 1 skipped; 162 tests passed, 61 skipped.
- `git diff --check`: clean.
- Only task-owned Rust files were formatted; unrelated pre-existing rustfmt differences were not rewritten.

## Wrangler smoke

The repository Wrangler custom build repeats `cargo install worker-build@0.1.14`, which cannot write the sandbox's read-only Cargo registry. The pinned binary was already installed, so the smoke used its fresh `worker-build --release` output and a temporary `/tmp` Wrangler config with the same Worker module/assets/bindings and no build hook. `CI=1`, `WRANGLER_REGISTRY_PATH`, persistence, logs, and XDG state were directed to `/tmp`; no repository config or pin changed.

Wrangler 4.100.0 reached `Ready on http://localhost:8792` and passed:

```text
GET  /project/p1    200; title + SSR <h2>目标</h2> + data-checklist
                         + role="progressbar" + data-id="p1-01"
GET  /project/nope  404 text/html; contains 页面不存在
HEAD /project/p1    200 text/html
Cache-Control: private, no-store
Vary: Cookie
```

The local Worker was stopped and the temporary config removed after the checks.

## Self-review

- Re-read the final template against every node and literal Tailwind class in the named TSX fact sources; no template class contains an Askama-generated Tailwind fragment.
- Confirmed SSR starts at React's empty server snapshot (`0 / total`, width 0%, unchecked, completion icon hidden), then the island immediately paints local progress and subscribes to later changes.
- Confirmed all brief HTML reaches Askama `safe` only after the existing markdown renderer escapes raw HTML.
- Confirmed the new checklist entry and existing progress entries share one stateful store chunk, so a checkbox write notifies every same-page subscriber.
- No deployment, production migration, dependency pin, generated content file, or unrelated application code was changed.

DONE
