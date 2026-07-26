# SQL Dojo Resources and Home Redesign

## Goal

Reduce the empty feel of the home page and add a practical SQL resource library that supports the existing exercise path. The resource library should feel like a learning workbench, not a blog platform or marketing page.

## Scope

- Add a top-level `/resources` page.
- Add a `资料库` navigation item.
- Redesign the home page with denser learning-oriented sections.
- Store resource content in static TypeScript data under `content/`.
- Link resources back to existing modules and exercises.

Out of scope:

- Full article detail routes.
- Search, CMS, markdown authoring, comments, or reading progress.
- User-generated content.

## Information Architecture

`/resources` will have three resource groups:

- `实战文章`: concise articles based on real SQL jobs such as retention, funnel analysis, customer segmentation, and query tuning.
- `SQL 模板`: reusable query patterns such as filtering, grouping, joining, windows, cohorts, and sargable date ranges.
- `概念速查`: short explanations for concepts that users often need while solving exercises.

Each resource item includes:

- `title`
- `summary`
- `category`
- `level`
- `tags`
- optional `moduleId`
- optional `exerciseId`
- optional `sql`

## Home Page Design

The new home page should keep the current quiet, utilitarian tone while making better use of vertical space:

- Hero remains direct: product name, value proposition, primary actions.
- Add a right-side SQL scenario panel with a realistic query snippet.
- Add an at-a-glance progress/coverage strip: 8 modules, 66 exercises, Postgres in browser, AI copilot.
- Add a `资料库精选` section with 4 selected resources.
- Add a `从问题到 SQL` section showing practical scenarios and where to practice them.

The first screen should still make `立即开练` obvious.

## Resources Page Design

The resources page should be a dense index:

- Intro header with short copy and a primary link back to first exercise.
- Grouped sections for articles, templates, and quick references.
- Resource cards use compact metadata, tags, and links to relevant module or exercise.
- SQL templates show a code block preview.

## Testing

Add focused tests for:

- Home page renders resource-oriented sections and links to `/resources`.
- Topbar contains and highlights `资料库`.
- Resource data has unique IDs and valid module/exercise references.
- Resources page renders all groups and at least one SQL template.

## Verification

Run:

- `npm test`
- `npm run lint`
- `npm run build`

Then verify locally and deploy to Cloudflare.
