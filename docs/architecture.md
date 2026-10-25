# Architecture

## Ownership

- `domain/schema.ts`: untrusted input validation, IDs, references, source URLs, structural and dependency cycles.
- `domain/engine.ts`: deterministic evaluation and immutable session transitions. No React, browser storage, network or graph renderer.
- `domain/transfer.ts`: portable sessions. Embedded summaries are informational; the application recomputes validity.
- `state/workspace.ts`: Zustand store, versioned local persistence, bounded session undo/redo, preferences and recovery state.
- `graph/layout.ts`: converts validated data into positioned React Flow nodes. Synthetic root/condition labels are presentation, not additional questions.
- `graph/DecisionCanvas.tsx`: graph interactions. Graph code loads separately from the core interface.
- `components`: Radix dialogs, question explanations, notes, import and sidebar.
- `lib/i18n.ts`: English/Persian interface copy; document text is supplied by the author.

The graph is a projection of the document and evaluation, never the source of decision truth. React Flow owns the viewport. Zustand owns durable workspace edits. Dialog visibility/search/filter are transient React state.

## Evaluation

The hierarchy is a rooted forest displayed under one synthetic root. Each question may have one structural parent, explicit prerequisites, and conditions. All question ancestors are prerequisites, even through intermediate topic groups. Cross-question conditions create a dependency DAG, validated before evaluation.

Evaluation is topological. `all` and `any` use true/false/unknown: an unanswered owner does not make its condition false. An inactive owner contributes false. For `any`, one true rule is enough; unrelated unanswered rule owners do not block recording unless they are explicit prerequisites or question ancestors.

Status precedence is: excluded ancestor / false condition → inactive; changed definition / missing option → review; deferred option → deferred; unresolved prerequisites → blocked or review; no answer → ready; changed dependency stamp → review; otherwise answered.

Independent dependencies do not automatically inherit exclusion. If question C explicitly depends on inactive question B but has no exclusion condition, C remains blocked. Authors must express applicability with `when` or structural ancestry. This avoids silently waiving a required decision.

## Revalidation

An answer records the canonical question definition and direct dependency stamps. A stamp contains status, option, recording token and definition, not recursive stamp strings. This avoids exponential serialization. Re-recording a prerequisite is deliberately conservative and requests downstream review even when its option is unchanged. Undo restores the previous session and its stamps together.

Question edits require review; a cosmetic edit may therefore invalidate an answer. Changes only to a source's text are not currently included in a question fingerprint: bump the question's `revision` when its evidence changes materially. Imported answer snapshots are user data, not cryptographic proof or an authorization mechanism.

## Persistence and recovery

The version-1 storage envelope includes documents, independent sessions, preferences and note drafts. History is limited to 50 session transitions and is not persisted. Switching projects clears history to avoid cross-project undo. A reset is undoable during the current visit.

Unreadable storage is kept intact and available for recovery download. Writes stop after a storage failure, with a visible warning; current in-memory work remains exportable. There is no claim of multi-tab consistency or background backup. Notes whose targets disappeared remain exportable by ID; removed answers are listed as orphaned for audit.

## Dependency rationale

React Flow provides the viewport and accessible node infrastructure; Dagre handles automatic hierarchy layout. Radix supplies dialog semantics/focus behavior; Motion adds restrained transitions. Zod validates runtime imports rather than relying on TypeScript alone. Zustand's small external store is sufficient for this single-user workspace; no network cache layer is needed.

Official references consulted:

- [React Flow layout](https://reactflow.dev/learn/layouting/layouting)
- [Zustand vanilla createStore](https://zustand.docs.pmnd.rs/apis/create-store)
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Motion accessibility](https://motion.dev/docs/react-accessibility)
- [Zod](https://zod.dev/)

The references support library usage, not the business meaning of example decisions.
