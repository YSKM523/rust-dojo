# SQL Dojo Resources and Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a practical SQL resources library and redesign the home page so the product feels like a denser learning workbench.

**Architecture:** Static resource metadata lives in `content/resources.ts` and is consumed by the home page and `/resources`. Navigation gets one new route. Tests verify resource integrity, route rendering, and navigation state.

**Tech Stack:** Next.js App Router, React Server Components for pages, TypeScript static content, Vitest and Testing Library.

## Global Constraints

- Keep content static; do not add a CMS.
- Do not add article detail routes in this pass.
- Keep the existing quiet utilitarian visual style.
- Link resource items back to existing module and exercise IDs.
- Use existing design tokens and lucide icons.

---

### Task 1: Resource Data Model

**Files:**
- Create: `content/resources.ts`
- Create: `content/resources.test.ts`

**Interfaces:**
- Produces: `resourceGroups: ResourceGroup[]`, `featuredResources: ResourceItem[]`, `scenarioCards: ScenarioCard[]`
- Consumes: `allModules`, `allExercises` for integrity tests

- [ ] **Step 1: Write failing resource integrity tests**

Add tests that assert resource IDs are unique, every group has items, featured items exist in groups, and module/exercise references point to existing content.

- [ ] **Step 2: Run red test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- content/resources.test.ts`

Expected: FAIL because `content/resources.ts` does not exist.

- [ ] **Step 3: Add resource metadata**

Define three groups: `articles`, `templates`, and `references`. Add featured resources and scenario cards.

- [ ] **Step 4: Run green test**

Run the same test command and expect PASS.

### Task 2: Resources Page

**Files:**
- Create: `app/resources/page.tsx`
- Create: `app/resources/page.test.tsx`

**Interfaces:**
- Consumes: `resourceGroups` from `content/resources.ts`
- Produces: route `/resources`

- [ ] **Step 1: Write failing page test**

Assert `/resources` renders `SQL 实战资料库`, all three group labels, and at least one SQL template code preview.

- [ ] **Step 2: Run red test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/resources/page.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement page**

Build a dense resource index with group sections, tags, module/exercise links, and code preview blocks.

- [ ] **Step 4: Run green test**

Run the same test command and expect PASS.

### Task 3: Home Page Redesign

**Files:**
- Modify: `app/page.tsx`
- Create: `app/page.test.tsx`

**Interfaces:**
- Consumes: `featuredResources`, `scenarioCards`
- Produces: home links to `/resources`

- [ ] **Step 1: Write failing home test**

Assert the home page renders `资料库精选`, `从问题到 SQL`, `今日实战场景`, and a link to `/resources`.

- [ ] **Step 2: Run red test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- app/page.test.tsx`

Expected: FAIL because current home page lacks these sections.

- [ ] **Step 3: Implement new home layout**

Add a split hero, SQL snippet panel, coverage strip, featured resources, and scenario cards.

- [ ] **Step 4: Run green test**

Run the same test command and expect PASS.

### Task 4: Navigation

**Files:**
- Modify: `components/Topbar.tsx`
- Create or modify: `components/Topbar.test.tsx`

**Interfaces:**
- Produces: top-level `资料库` nav item

- [ ] **Step 1: Write failing nav test**

Mock `usePathname()` as `/resources` and assert `资料库` is active.

- [ ] **Step 2: Run red test**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test -- components/Topbar.test.tsx`

Expected: FAIL because `资料库` nav is missing.

- [ ] **Step 3: Add nav item**

Add `/resources` to Topbar and active detection.

- [ ] **Step 4: Run green test**

Run the same test command and expect PASS.

### Task 5: Verification and Deploy

**Files:**
- No new source files

- [ ] **Step 1: Run full tests**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm test`

- [ ] **Step 2: Run lint**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm run lint`

- [ ] **Step 3: Run build**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm run build`

- [ ] **Step 4: Verify in browser**

Check home page, `/resources`, and mobile width.

- [ ] **Step 5: Deploy**

Run: `PATH=/home/ubuntu/.nvm/versions/node/v22.22.2/bin:$PATH env -u NODE_OPTIONS npm run deploy`
