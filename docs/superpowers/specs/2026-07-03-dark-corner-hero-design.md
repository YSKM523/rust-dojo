# Dark Corner Hero Design

## Goal

Make SQL Dojo feel more cinematic and high-impact by turning the whole product background dark and expanding the homepage hero into a near-full-screen stage with content anchored to the four corners.

## Approved Direction

- The site background should be dark, not a light page with a dark card.
- The homepage hero should fill the first viewport with `SQL 道场` as the dominant brand signal.
- Hero text should be distributed across four corners:
  - Top-left: product/system metadata.
  - Top-right: compact product metrics.
  - Bottom-left: huge product name and positioning.
  - Bottom-right: primary and secondary actions.
- The center should remain a SQL/data stage, reinforcing that this is a real browser SQL product.
- Mobile should stack the same information without overlap or document-level horizontal scroll.

## Constraints

- Keep the existing Next.js/Tailwind stack.
- Do not add heavy animation, WebGL, canvas, or 3D dependencies.
- Keep readable contrast and AA brand button contrast.
- Preserve existing homepage links and page routes.
- Verify desktop and mobile layouts in the browser.
