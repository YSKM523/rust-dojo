# Awwwards UI Refresh Design

## Goal

Upgrade SQL Dojo from a functional teaching app into a high-impact public product showcase. The first impression should feel professional, modern, and design-forward while preserving the app's real learning and SQL execution workflows.

## Audience And Page Type

- Primary audience: public viewers evaluating the product, including recruiters, peers, potential users, and portfolio visitors.
- Secondary audience: learners who still need clear entry points into exercises, resources, and progress.
- Page type: Awwwards-inspired technical product site with a working tool behind it.

## Visual Direction

The visual system should borrow award-site qualities: strong first-viewport signal, compact metadata, editorial section rhythm, dark technical media surfaces, precise dividers, and restrained motion. It must not become decorative for its own sake. The product is SQL practice, so code, query results, modules, and resources are the real visual assets.

Use a palette based on:
- Near-ink dark surfaces for code and workbench areas.
- Warm off-white editorial surfaces for content pages.
- Existing SQL Dojo orange as the brand signal, used more precisely and confidently.
- Muted secondary text and hairline borders for density.

Avoid generic AI aesthetics: purple-blue gradients, decorative blobs, oversized rounded cards, stock hero imagery, and empty marketing copy.

## Scope

### Homepage

Create a high-impact brand homepage. The first viewport should make `SQL 道场` the dominant subject and pair it with a dense SQL/data stage. The hero should include:

- Large product name and concise positioning.
- Primary action to start the first exercise.
- Secondary actions for resources and route map.
- A visual stage showing SQL, query outcome metadata, module counts, and practice signals.
- Section rhythm below the hero: featured resources, route/progression preview, scenario map.

The homepage can be more dramatic than the app screens, but it must stay readable and not hide critical actions.

### Resources Page

Turn the resources page into an editorial content index. It should feel like a curated library, not a plain card list:

- Strong page header with a compact directory-like summary.
- Distinct visual treatment for articles, SQL templates, and concept references.
- Cards should use metadata, tags, and code blocks with stable dimensions and no mobile overflow.
- The next section should be visible enough to make the page feel dense and alive.

### Learn Route

Upgrade the route page from a simple grid into a premium course index:

- Strong header with course-level metadata.
- Module cards should feel like entries in a structured curriculum.
- Progress and difficulty should be scannable without bloating cards.

### Exercise Workbench

Keep the exercise page practical, but make it feel like a professional SQL workbench:

- Stronger exercise header with module, difficulty, and prompt hierarchy.
- Editor/run/result/AI surfaces should share a consistent workbench language.
- Do not reduce editor usability or hide output information behind decorative layout.

### Global UI

Update global tokens and shared components to support the new direction:

- More premium neutral colors in light and dark themes.
- Topbar should feel compact, precise, and slightly more product-like.
- Buttons, tags, and cards should have consistent radii, borders, and hover behavior.
- Add subtle reveal/hover motion with `prefers-reduced-motion` fallback.

## Constraints

- Keep the existing Next.js/Tailwind stack.
- Do not introduce heavy animation, 3D, canvas, or WebGL libraries.
- Use existing content and exercise data as the visual substance.
- Keep accessibility basics: readable contrast, keyboard-visible focus, no overlapping text, no page-level horizontal overflow on mobile.
- Preserve existing routes and behavior.

## Testing And Verification

- Add or update focused React tests for any new visible structure or content expectations.
- Run full `npm test`, `npm run lint`, and `npm run build`.
- Verify locally in browser at desktop and mobile widths.
- Check home, resources, learn, and one exercise page.
- Confirm mobile pages have no document-level horizontal overflow.
- Deploy and verify the live site after build passes.
