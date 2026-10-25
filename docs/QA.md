# Validation evidence — 2026-10-25

## Executed checks

| Check           | Actual result                              |
| --------------- | ------------------------------------------ |
| `npm run lint`  | exit 0                                     |
| `npm test`      | exit 0; 7 files / 54 tests                 |
| `npm run build` | exit 0; TypeScript and production bundling |
| `npm run check` | exit 0; sequential lint, tests, build      |

Node 24.22.1 was used. Build chunks were split by responsibility; the production build completed without the earlier large-chunk warning. This is not a measured initial-load performance score.

## Covered behavior

- Invalid JSON, duplicate/reserved IDs, unknown references, parent/dependency cycles, contradictory conditions and unsafe source links.
- 300-level topic hierarchy validation.
- Recommendations/drafts excluded from recorded counts; blocked children; excluded paths; deferrals.
- All/any semantics; reopening paths; transitive downstream review; revised definitions; orphan answers.
- Local persistence round trip, quota failure, preservation of corrupt data, note drafts, independent sessions, undo/redo/reset.
- Portable session round trip, orphan note retention and recomputation of imported summaries.
- Finite graph coordinates and distinct synthetic conditional branches.
- DOM interactions: full question, recommendation without automatic recording, explicit save/close, explanation-only excluded path, blocked save, invalid import, Escape and outside-overlay dismissal.

## Evidence limits

DOM tests use jsdom; they are not Chrome or mobile-browser tests. Local browser control was unavailable in the current environment. Real viewport rendering, clipping/overflow, wheel/pinch behavior, real-browser outside-click dismissal, focus restoration through exit animations, screen-reader behavior, contrast and touch must still be checked in a real browser.

Font and dependency license notices are included in the built output; UI attribution is hidden via the supported React Flow option. The concept SVG in the README is an illustration, not a screenshot of a verified runtime.

The library accepts documents up to 5,000 nodes; the full size limit is not benchmarked or guaranteed usable on every device. Multi-tab concurrency and server-backed synchronization are not implemented.

## Manual acceptance checklist

- Desktop + 320/390/768px widths, 200% text zoom and long Persian/English text.
- Open/close every dialog via button, Escape and outside click; test nested note/confirmation dialogs.
- Reduced-motion OS setting and application animation preference.
- Graph/list navigation, keyboard focus, wheel/pinch/Space-pan, Alt-node and Alt-edge notes.
- Save, reload, export, reset, undo, import and restoration from the same origin.
- Simulate full storage, blocked storage and invalid local JSON; verify warning and backup preservation.
- Evaluate NVDA/VoiceOver, dark/light contrast and mobile touch interaction.

## Status

Automated code checks: PASS. Real-browser UX/accessibility acceptance: NOT TESTED. GitHub publication is tracked separately from local validation and must use the requested account.

## Select and bidirectional interface update

Replaced the two native selects with the shadcn/Radix Select source component. Added explicit direction for portalled menus, logical alignment/indicator placement, semantic theme tokens and reduced-motion-aware popup transitions. Root UI direction follows the persisted interface language; document text retains its own direction and JSON/IDs remain LTR. Progress ratios are bidi-isolated, and forward arrows mirror in RTL. New DOM tests exercise RTL popup direction, pointer/keyboard selection, language toggling, answer preservation, progress order and preference restoration. This remains DOM evidence, not real-browser popup geometry or a visual responsive audit.

## Repository presentation checks

The shipped example datasets have been removed. Current startup tests cover empty storage, one-time cleanup of only the former example IDs, preservation of a user project, selection of a surviving active project, and persistent dismissal of the canvas hint. Earlier validation of downloadable examples is historical and does not describe the current package.

The README hero was inspected as a static image and labelled as concept artwork. The supplied social-preview image is 1280 × 640; uploading it to GitHub's social-preview setting is separate from committing the file.
