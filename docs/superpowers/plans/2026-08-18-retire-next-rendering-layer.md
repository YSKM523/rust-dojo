# Retire the Next.js Rendering Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the retired Next/React/OpenNext rendering stack while preserving the production Rust SSR worker, its framework-free islands, content, libraries, assets, and tests.

**Architecture:** The Rust worker in `workers/api` becomes the only deploy target and owns the production Worker name. Static assets continue to be generated at the repository root, but icon sources move under `islands/static`; the remaining TypeScript toolchain covers only framework-free code and tests.

**Tech Stack:** Rust/worker-rs, Cloudflare Wrangler, TypeScript, Vitest, ESLint 9, typescript-eslint, Tailwind CSS v4 CLI, esbuild.

## Global Constraints

- Production deployment is out of scope; this task only changes the repository.
- `content/`, its tests, and every file under `lib/` remain present.
- `islands/`, `scripts/`, `workers/`, `docs/`, `migrations/`, and referenced public assets remain available.
- `workers/api/wrangler.jsonc` uses the production Worker name `rust-dojo`.
- Verification uses Node.js `v22.22.0` and runs assets, full Vitest, TypeScript, ESLint, and native Rust tests.
- The commit message is exactly `chore: retire the Next.js rendering layer (single Rust worker serves the site)` and has no `Co-Authored-By` trailer.

---

### Task 1: Preserve live theme and icon assets

**Files:**
- Move: `app/theme-contrast.test.ts` to `islands/theme-contrast.test.ts`
- Move: `app/favicon.ico` to `islands/static/favicon.ico`
- Move: `app/icon.png` to `islands/static/icon.png`
- Move: `app/apple-icon.png` to `islands/static/apple-icon.png`
- Modify: `scripts/build-site-assets.mjs`

**Interfaces:**
- Consumes: `islands/site.css` theme token blocks and the existing asset output contract.
- Produces: the same root icon outputs in `assets-dist/` without any source dependency on `app/`.

- [x] **Step 1: Move the theme test and update only its CSS source path**

Run `git mv app/theme-contrast.test.ts islands/theme-contrast.test.ts`, then change:

```ts
const css = readFileSync(join(process.cwd(), 'islands/site.css'), 'utf8');
```

- [x] **Step 2: Verify the migrated contrast test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npx vitest run islands/theme-contrast.test.ts`

Expected: one test file passes with all eight contrast cases green.

- [x] **Step 3: Move icon sources and update the asset builder**

Run `mkdir -p islands/static` followed by three `git mv` commands. In `scripts/build-site-assets.mjs`, define `STATIC_SOURCE = path.join(ROOT, 'islands', 'static')`, copy all three icons from that directory, and update the log message to `islands/static/{favicon.ico,icon.png,apple-icon.png} -> assets-dist/`.

- [x] **Step 4: Verify the asset contract before deleting `app/`**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npm run assets`

Expected: exit 0 and every self-check reports `PASS`.

### Task 2: Remove rendering and deployment remnants

**Files:**
- Delete: `app/`
- Delete: `components/`
- Delete: `next.config.ts`
- Delete: `open-next.config.ts`
- Delete: `next-env.d.ts`
- Delete: `postcss.config.mjs`
- Delete: `worker-entry.mjs`
- Delete: `wrangler.jsonc`
- Delete: `.open-next/`
- Delete: `.next/`
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
- Modify: `workers/api/wrangler.jsonc`

**Interfaces:**
- Consumes: the already-deployed single Rust worker layout.
- Produces: one tracked deployment configuration at `workers/api/wrangler.jsonc`, named `rust-dojo`.

- [x] **Step 1: Remove tracked rendering files explicitly**

Run `git rm -r app components` and path-specific `git rm` for each tracked root config and unused starter SVG.

- [x] **Step 2: Remove ignored OpenNext build output**

Delete the exact repository-local `.open-next/` directory, then verify `test ! -e .open-next`.

- [x] **Step 3: Set the Rust Worker production name**

Change the first field in `workers/api/wrangler.jsonc` to:

```json
"name": "rust-dojo"
```

### Task 3: Retire framework dependencies and configs

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.config.ts`
- Modify: `eslint.config.mjs`
- Modify: `tsconfig.json`
- Modify: `lib/auth/cookie.ts`
- Modify: `lib/auth/useSession.ts`
- Modify: `lib/progress/useProgress.ts`

**Interfaces:**
- Consumes: framework-free browser APIs, `lib/auth/session.ts`, and `lib/progress/store.ts`.
- Produces: Node 22 scripts and a TypeScript/ESLint toolchain with no Next or React package requirements.

- [x] **Step 1: Rewrite package scripts and dependency declarations**

Set `dev` to `cd workers/api && wrangler dev`, remove `build`, `start`, and `preview`, and set `deploy` to `npm run assets && cd workers/api && wrangler deploy`. Remove Next/React/OpenNext/rendering-only packages and add direct dev dependencies on `@eslint/js` and `typescript-eslint`.

- [x] **Step 2: Remove the Vitest React transform**

Delete the `@vitejs/plugin-react` import and `plugins: [react()]` entry from `vitest.config.ts`; retain jsdom and jest-dom support used by island tests.

- [x] **Step 3: Replace framework-specific library adapters**

In `lib/auth/cookie.ts`, replace `NextRequest` with a structural cookie-reader interface. Replace the unused React hook in `lib/auth/useSession.ts` with an async `fetchSession` browser transport, and replace `lib/progress/useProgress.ts` with framework-free re-exports named `getCompletedIds`, `getServerCompletedIds`, and `subscribeCompletedIds`.

- [x] **Step 4: Minimize lint and TypeScript configuration**

Use `@eslint/js` plus `typescript-eslint` recommended flat configs and ignore generated/build directories. Remove `jsx`, Next plugins, Next generated types, and TSX includes from `tsconfig.json`, while preserving `paths: { "@/*": ["./*"] }`.

- [x] **Step 5: Refresh the lockfile on Node 22**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH npm install`

Expected: exit 0, `package-lock.json` reflects the smaller direct dependency graph, and npm reports no install failure.

### Task 4: Verify, report, and commit

**Files:**
- Create: `.superpowers/sdd/2026-08-18-rust-ssr-phase-b/task-15-report.md`

**Interfaces:**
- Consumes: the completed repository cleanup and fresh command output.
- Produces: a reproducible completion report ending in `DONE`, plus one scoped commit.

- [x] **Step 1: Run every required verification gate**

Run, with Node 22 where applicable:

```bash
npm run assets
npx vitest run
npx tsc --noEmit
npx eslint .
cd workers/api && cargo test
```

Expected: all commands exit 0; Vitest reports 19 fewer test files because seven App page test files and twelve component test files were intentionally removed.

- [x] **Step 2: Audit the deletion and dependency boundaries**

Verify the deleted paths are absent, `public/hero-blueprint.webp` is retained, no package declaration references Next/React/OpenNext, `workers/api/wrangler.jsonc` is named `rust-dojo`, and the unrelated existing edit to `task-6-report.md` remains unstaged.

- [x] **Step 3: Write the task report**

Record migrations, removals, retained public assets, dependency/config changes, exact test-file reduction, and every command result in `task-15-report.md`; make the final line exactly `DONE` only after all gates pass.

- [x] **Step 4: Stage only task paths and commit**

Use path-specific `git add`, force-add the ignored task report, confirm the staged diff excludes `task-6-report.md`, then commit with:

```bash
git commit -m "chore: retire the Next.js rendering layer (single Rust worker serves the site)"
```
