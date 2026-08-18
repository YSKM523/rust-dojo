# Task 15 Report — Next/React rendering layer retirement

## Outcome

- Retired the repository's Next.js, React, and OpenNext rendering/deployment layer. No production deployment was run.
- The only tracked deployment config is now `workers/api/wrangler.jsonc`, with Worker name `rust-dojo`.
- Root scripts now use the Rust Worker flow: `dev` enters `workers/api`, and `deploy` is `npm run assets && cd workers/api && wrangler deploy`.

## Preserved and migrated inputs

- Moved `app/theme-contrast.test.ts` to `islands/theme-contrast.test.ts`; the assertion logic is unchanged and its CSS source is now `islands/site.css`.
- Moved `favicon.ico`, `icon.png`, and `apple-icon.png` from `app/` to `islands/static/`; `scripts/build-site-assets.mjs` now copies from that directory while preserving the same `assets-dist/` output paths.
- Retained every file under `content/` and `lib/`, all content/lib/islands tests, all islands, scripts, workers, docs, migrations, and the referenced `public/hero-blueprint.webp`.
- Retained `public/hero-preview/` as an independent design-preview artifact. Removed the unreferenced Next starter files `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, and `window.svg`.
- Removed ignored local build products `.open-next/` (34 MB) and `.next/` (372 MB), then removed their stale `.gitignore` entries.

## Removed rendering layer

- Removed all of `app/`, including the retired API routes and pages, after migrating the live contrast test and icon sources.
- Removed all of `components/`.
- Removed `next.config.ts`, `open-next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `worker-entry.mjs`, and root `wrangler.jsonc`.
- Removed direct and transitive installations of Next/React/OpenNext rendering packages, including `next`, `react`, `react-dom`, `@opennextjs/cloudflare`, `@uiw/react-codemirror`, `react-markdown`, `remark-gfm`, `lucide-react`, `@tailwindcss/postcss`, `@testing-library/react`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, and `eslint-config-next`.
- `npm install` on Node 22 removed 554 packages and refreshed `package-lock.json`. It reported 9 audit findings (1 low, 1 moderate, 7 high); no potentially scope-expanding `npm audit fix` was run.

## Framework-free TypeScript cleanup

- Removed the React transform from Vitest while retaining jsdom, Testing Library DOM, and jest-dom for island tests.
- Replaced Next ESLint presets with ESLint recommended + typescript-eslint recommended and explicit browser/Node globals.
- Removed Next plugin/types, JSX, TSX, and generated `.next` includes from `tsconfig.json`; retained the `@/*` alias.
- Preserved the complete `lib/` tree while eliminating its last framework imports:
  - `lib/auth/cookie.ts` now accepts a structural cookie-reader request instead of `NextRequest`.
  - `lib/auth/useSession.ts` exposes the framework-free `fetchSession` transport used to obtain the same final session value.
  - `lib/progress/useProgress.ts` exposes framework-free progress snapshot/subscription aliases over the existing store.
- Removed the existing unused `exportNames` parameter from `scripts/gen-manifest.mjs`, the only error exposed by the new minimal lint configuration.

## Test retirement accounting

Baseline before deletion: 48 files (47 passed, 1 skipped), 271 tests (210 passed, 61 skipped).

Final: 29 files (28 passed, 1 skipped), 235 tests (174 passed, 61 skipped).

The exact net reduction is 19 test files and 36 tests. The deleted test files were:

- App page tests (7): `app/exercise/[id]/page.test.tsx`, `app/learn/page.test.tsx`, `app/login/page.test.tsx`, `app/me/page.test.tsx`, `app/page.test.tsx`, `app/resources/[id]/page.test.tsx`, `app/resources/page.test.tsx`.
- React component tests (12): `components/AiCopilot.test.tsx`, `components/CodeEditor.test.tsx`, `components/ExerciseList.test.tsx`, `components/LessonView.test.tsx`, `components/ModuleCard.test.tsx`, `components/ModuleProgressBadge.test.tsx`, `components/Playground.test.tsx`, `components/ProjectCard.test.tsx`, `components/ProjectChecklist.test.tsx`, `components/RunOutput.test.tsx`, `components/Topbar.test.tsx`, `components/VerdictBanner.test.tsx`.

`islands/theme-contrast.test.ts` remains active and passed 8/8 assertions after migration.

## Fresh verification (Node v22.22.0)

- `npm run assets`: PASS, 33/33 asset self-checks.
- `npx vitest run`: PASS, 28 passed files + 1 skipped; 174 passed tests + 61 skipped.
- `npx tsc --noEmit`: PASS, exit 0.
- `npx eslint .`: PASS, exit 0 with no output.
- `cd workers/api && cargo test`: PASS, 22 unit + 30 integration tests; 0 failed; doc tests 0 failed.
- Boundary audit: all requested paths absent, `public/hero-blueprint.webp` and all three migrated icons present, deployment script exact, Worker name exact, and `npm ls` for the removed rendering packages returns an empty tree.
- `git diff --check HEAD`: PASS.

The pre-existing modification to `task-6-report.md` was preserved and excluded from this task's staging/commit.

DONE
