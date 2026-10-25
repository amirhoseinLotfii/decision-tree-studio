# Release notes — 0.1.0

Decision Tree Studio turns structured questions into an interactive workspace for decisions with dependencies, explanations and portable answers.

## Included

- JSON-driven topics, questions, recommendations and sources.
- Explicit prerequisites, all/any conditions and downstream review.
- Graph/list views, contextual notes and persistent drafts.
- Independent local project sessions, undo/redo and portable exports.
- English/Persian UI, RTL-aware shadcn selects, Motion transitions and reduced-motion handling.
- Bilingual docs, a minimal starter, fictional workflow examples and automated validation.

## Run

Requires Node 24.15+. Clone, run `npm ci`, then `npm run dev`. For the static build run `npm run build`; serve `dist/` over HTTP(S).

## Validation and scope

Automated lint, domain/store/DOM tests, TypeScript and build are documented in `docs/QA.md`. DOM tests do not establish a real-browser accessibility or mobile audit. This release is a single-user application, not an installable component package, a citation verifier or a collaboration service.

Only fictional examples are included. Concept artwork is labelled as illustration. Dependencies and font/source licenses retain their own notices.
