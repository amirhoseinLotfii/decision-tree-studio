# Decision Tree Studio — implementation brief

Build a reusable React and TypeScript application from the existing local prototype. A validated JSON document owns content; an independent pure engine owns decision meaning; Zustand owns workspace state; React Flow owns the viewport. Radix Dialog handles modal accessibility. Dagre lays out arbitrary-depth hierarchies. Zod validates documents and sessions before state changes. English and Persian interfaces, neutral dark and light themes, a restrained green accent, and a redistributable OFL font are included.

## In scope

- JSON documents with groups, questions, alternatives, recommendations, examples, outcomes, evidence, all/any conditions and explicit prerequisites.
- Deterministic dependency evaluation, inactive explanations, stale-answer review, completion that excludes irrelevant branches.
- Graph and list views; search and status filters; minimap; dependency overlays; zoom and pan.
- Accessible decision, note and import dialogs; safe text rendering; local drafts and session restoration; undo/redo.
- Portable document and session downloads, clipboard fallback, node/edge notes, reset confirmation.
- Schema documentation, bilingual introduction, architecture, contribution guide, QA evidence, release roadmap and CI.

## Boundaries

The existing application and local user answers are untouched. No production repository, database, backend, user credentials, commercial font, personal notes or proprietary decision corpus is copied into tracked files. The workspace starts empty; user documents are imported locally and never bundled as project datasets. No automatic research, model inference, collaboration, authentication or server-side policy execution is claimed.

## Validation and stop conditions

Run lint, pure-engine/schema/store/React tests and a strict TypeScript production build. Reject invalid imports without changing the current document. Reject dangling references and cycles; preserve review states after dependency changes. Publishing targets only the confirmed account amirhoseinLotfii. No force push or invented validation claims. Browser visual/device testing is recorded separately from automated DOM checks.
