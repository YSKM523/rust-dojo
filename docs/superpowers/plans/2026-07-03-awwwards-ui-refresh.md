# Awwwards UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade SQL Dojo into a high-impact, Awwwards-inspired public product showcase while preserving the learning and exercise workflows.

**Architecture:** Reuse the existing Next.js App Router pages and Tailwind token system. Make the homepage the strongest brand moment, then align resources, route, topbar, and exercise surfaces to the same visual language with small component changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Vitest, Testing Library, lucide-react, Cloudflare Workers/OpenNext.

## Global Constraints

- Keep the existing Next.js/Tailwind stack.
- Do not introduce heavy animation, 3D, canvas, or WebGL libraries.
- Use existing content and exercise data as the visual substance.
- Preserve existing routes and behavior.
- Keep readable contrast, keyboard-visible focus, and no page-level horizontal overflow on mobile.
- Respect `prefers-reduced-motion`.

---

### Task 1: Global Visual Tokens And Topbar

**Files:**
- Modify: `app/globals.css`
- Modify: `components/Topbar.tsx`
- Modify: `components/Topbar.test.tsx`

**Interfaces:**
- Consumes: existing CSS variables used by Tailwind tokens.
- Produces: updated theme variables and topbar markup/classes used across all pages.

- [ ] **Step 1: Write the failing test**

Update `components/Topbar.test.tsx` so it also expects the product-style brand label and resources nav to remain present:

```tsx
it('renders compact product navigation', () => {
  render(<Topbar />);

  expect(screen.getByRole('link', { name: 'SQL 道场' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: '学习路线图' })).toHaveAttribute('href', '/learn');
  expect(screen.getByRole('link', { name: '资料库' })).toHaveAttribute('href', '/resources');
  expect(screen.getByRole('link', { name: '我的足迹' })).toHaveAttribute('href', '/me');
});
```

- [ ] **Step 2: Run test to verify it fails if expected structure is missing**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- components/Topbar.test.tsx`

Expected: it should pass on current structure or fail only if a required link is missing. This guards the later visual refactor.

- [ ] **Step 3: Update global CSS tokens**

In `app/globals.css`, revise theme variables to a more premium warm-neutral palette, add `html { background: var(--bg); }`, add visible focus styling, and add reduced-motion-safe reveal utilities:

```css
:root,
[data-theme="light"] {
  --bg: #eeebe4;
  --panel: #fbfaf6;
  --panel2: #f3efe6;
  --line: #d9d2c4;
  --fg: #16181d;
  --fg2: #555b66;
  --fg3: #85816f;
  --brand: #c25a0a;
  --brand-hover: #9b4104;
  --link: #8a3d05;
  --ok: #0a7f47;
  --ok-soft: #e3f3ea;
  --bad: #bd2719;
  --bad-soft: #f8e7e2;
  --shadow-card-v: 0 18px 50px rgba(30, 27, 20, 0.08);
}
```

- [ ] **Step 4: Update `Topbar` styling**

Make the topbar translucent and precise:

```tsx
<header className="sticky top-0 z-20 flex h-[58px] items-center gap-4 border-b border-line/80 bg-panel/88 px-4 backdrop-blur-xl">
```

Use compact uppercase metadata styling for links while keeping accessible text unchanged.

- [ ] **Step 5: Run test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- components/Topbar.test.tsx`

Expected: PASS.

### Task 2: High-Impact Homepage

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: `allModules`, `allExercises`, `featuredResources`, `scenarioCards`.
- Produces: a stronger homepage with the same primary links: `/exercise/m1-01`, `/resources`, `/learn`.

- [ ] **Step 1: Write the failing test**

Update `app/page.test.tsx` to expect the new visual content anchors:

```tsx
expect(screen.getByText('LIVE SQL TRAINING SYSTEM')).toBeInTheDocument();
expect(screen.getByText('Postgres in browser')).toBeInTheDocument();
expect(screen.getByRole('heading', { name: 'SQL 道场' })).toBeInTheDocument();
expect(screen.getByRole('heading', { name: '训练路径' })).toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify red**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/page.test.tsx`

Expected: FAIL because the new labels are not present yet.

- [ ] **Step 3: Implement homepage layout**

Replace the current homepage with:

- Full-width dark hero stage inside the main content.
- Oversized `SQL 道场` heading.
- Metadata strip with module/exercise/resource signals.
- Code panel with query and small result preview.
- Featured resources in an asymmetric grid.
- Route preview section titled `训练路径`.
- Existing `从问题到 SQL` scenario map retained with premium styling.

- [ ] **Step 4: Run homepage test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/page.test.tsx`

Expected: PASS.

### Task 3: Editorial Resources Page

**Files:**
- Modify: `app/resources/page.tsx`
- Modify: `app/resources/page.test.tsx`

**Interfaces:**
- Consumes: `resourceGroups`, `ResourceItem`.
- Produces: a curated library page that still exposes article, template, and reference content.

- [ ] **Step 1: Write the failing test**

Update `app/resources/page.test.tsx` to expect an editorial directory label:

```tsx
expect(screen.getByText('FIELD LIBRARY')).toBeInTheDocument();
expect(screen.getByText('Article Index')).toBeInTheDocument();
expect(screen.getByText('Query Patterns')).toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify red**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/resources/page.test.tsx`

Expected: FAIL because the new labels are not present yet.

- [ ] **Step 3: Implement resources page visual update**

Add a strong directory header, split section labels into English metadata plus Chinese headings, give SQL templates a darker code-forward card style, and keep all links intact.

- [ ] **Step 4: Run resources test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/resources/page.test.tsx`

Expected: PASS.

### Task 4: Route Index And Module Cards

**Files:**
- Modify: `app/learn/page.tsx`
- Modify: `components/ModuleCard.tsx`
- Create or modify: `app/learn/page.test.tsx`

**Interfaces:**
- Consumes: `allModules`, `exercisesByModule`, `ModuleProgressBadge`.
- Produces: premium curriculum index while preserving links to `/learn/[moduleId]`.

- [ ] **Step 1: Write failing route page test**

Create `app/learn/page.test.tsx` with:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearnPage from './page';

describe('LearnPage', () => {
  it('renders the premium training route index', () => {
    render(<LearnPage />);

    expect(screen.getByText('TRAINING ROUTE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '训练路径' })).toBeInTheDocument();
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href')?.startsWith('/learn/m'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test and verify red**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/learn/page.test.tsx`

Expected: FAIL because `TRAINING ROUTE` is not present yet.

- [ ] **Step 3: Update learn page and module cards**

Add product-style header metadata, a compact route summary strip, and module cards with stronger numbering, tier badges, and hover feedback.

- [ ] **Step 4: Run learn test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/learn/page.test.tsx`

Expected: PASS.

### Task 5: Exercise Workbench Polish

**Files:**
- Modify: `app/exercise/[id]/page.tsx`
- Modify: `components/Playground.tsx`
- Modify: `components/SqlEditor.tsx`
- Modify: `components/AiCopilot.tsx` if needed for visual consistency.
- Test: existing `components/Playground.test.tsx`, `components/AiCopilot.test.tsx`

**Interfaces:**
- Consumes: `Exercise`, `Playground`, `AiCopilot`.
- Produces: polished workbench surfaces without changing judge behavior.

- [ ] **Step 1: Write or update a focused test**

If no exercise page test exists, create `app/exercise/[id]/page.test.tsx` only if the async route can be rendered cleanly. Otherwise, update existing component tests to assert the run button and AI assistant remain reachable:

```tsx
expect(screen.getByRole('button', { name: /运行/ })).toBeInTheDocument();
expect(screen.getByText(/AI/)).toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests before styling**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- components/Playground.test.tsx components/AiCopilot.test.tsx`

Expected: PASS before styling; these are guard tests for behavior.

- [ ] **Step 3: Update workbench styling**

Make the exercise page wider, add a dark workbench frame around the editor/run area, improve prompt hierarchy, and keep result/error/AI surfaces readable.

- [ ] **Step 4: Run focused tests after styling**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- components/Playground.test.tsx components/AiCopilot.test.tsx`

Expected: PASS.

### Task 6: Full Verification, Browser QA, Deploy

**Files:**
- No product code unless browser QA exposes a layout bug.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: deployed live site.

- [ ] **Step 1: Run full test suite**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm run lint`

Expected: exit 0.

- [ ] **Step 3: Run production build**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm run build`

Expected: exit 0.

- [ ] **Step 4: Browser QA locally**

Open local dev server and inspect:

- `/`
- `/resources`
- `/learn`
- `/exercise/m1-01`

At desktop and mobile widths, check that no page has document-level horizontal overflow, no text overlaps, and the first viewport is nonblank and readable.

- [ ] **Step 5: Deploy**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm run deploy`

Expected: Cloudflare deploy succeeds and prints a new version ID.

- [ ] **Step 6: Verify production**

Open `https://sql-dojo.pp-account.workers.dev/`, `/resources`, `/learn`, and `/exercise/m1-01` with a cache-busting query. Check console errors and mobile overflow.

## Self-Review

- Spec coverage: homepage, resources, route, exercise, global tokens, motion, accessibility, and deploy verification are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: no new exported TypeScript interfaces are required; existing route and content interfaces stay unchanged.
