# Dark Corner Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert SQL Dojo to a dark global background and rebuild the homepage hero as a full-screen four-corner product stage.

**Architecture:** Update global CSS theme tokens to dark defaults, then refactor `app/page.tsx` hero markup. Keep existing content data and routes intact.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Vitest, Testing Library.

## Global Constraints

- Keep the existing Next.js/Tailwind stack.
- Do not add heavy animation, WebGL, canvas, or 3D dependencies.
- Keep readable contrast and AA brand button contrast.
- Preserve existing homepage links and page routes.
- Verify desktop and mobile layouts in the browser.

---

### Task 1: Tests

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `app/theme-contrast.test.ts`

**Steps:**
- [ ] Add homepage expectations for four visible corner labels: `SYSTEM / 01`, `SIGNALS / 02`, `IDENTITY / 03`, `ACTIONS / 04`.
- [ ] Add CSS token expectation that the light/default `--bg` color is dark enough for a dark product background.
- [ ] Run focused tests and confirm the homepage test fails before implementation.

### Task 2: Global Dark Tokens

**Files:**
- Modify: `app/globals.css`

**Steps:**
- [ ] Change light/default theme tokens to dark product colors.
- [ ] Keep dark theme dark as a slightly different high-contrast variant.
- [ ] Ensure brand and brand hover colors still pass AA contrast with white text.

### Task 3: Full-Screen Four-Corner Hero

**Files:**
- Modify: `app/page.tsx`

**Steps:**
- [ ] Make the homepage hero use `min-h-[calc(100svh-58px)]`.
- [ ] Place hero metadata in the top-left.
- [ ] Place metrics in the top-right.
- [ ] Place huge brand title and positioning in the bottom-left.
- [ ] Place CTAs and SQL stage result metadata in the bottom-right.
- [ ] Keep the central SQL stage visible and responsive.

### Task 4: Verification And Deploy

**Steps:**
- [ ] Run focused tests.
- [ ] Run full `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Browser-check local desktop and mobile.
- [ ] Deploy.
- [ ] Browser-check production desktop and mobile.
