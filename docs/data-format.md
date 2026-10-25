# Decision document format 1.0

A document is JSON. Do not supply executable HTML, scripts or functions. Text renders as text. Source links must use HTTP(S). Input is validated before replacing the active document.

## Minimal document

```json
{
  "formatVersion": "1.0",
  "id": "team-planning",
  "version": "1",
  "title": "Team planning",
  "locale": "en",
  "direction": "ltr",
  "sources": [
    {
      "id": "team-analysis",
      "title": "Team proposal",
      "kind": "analysis",
      "claim": "This is our proposed workflow, not an external rule."
    }
  ],
  "nodes": [
    { "id": "launch", "kind": "group", "title": "Launch", "parentId": null },
    {
      "id": "audience",
      "kind": "question",
      "parentId": "launch",
      "title": "Initial audience",
      "prompt": "Who should try the first release?",
      "example": "A team of five wants feedback before inviting the whole company.",
      "options": [
        {
          "id": "pilot",
          "label": "Invite a small pilot",
          "recommended": true,
          "benefits": ["Feedback stays manageable."],
          "risks": ["The pilot may miss other teams' needs."],
          "example": "Invite five people for one week.",
          "outcome": "Review their feedback before expanding.",
          "rationale": "This is a cautious starting point for this example.",
          "sourceIds": ["team-analysis"]
        },
        {
          "id": "everyone",
          "label": "Invite everyone",
          "benefits": ["Broader feedback."],
          "risks": ["More support work immediately."]
        }
      ]
    },
    {
      "id": "pilot-owner",
      "kind": "question",
      "parentId": "audience",
      "title": "Pilot owner",
      "prompt": "Who owns the pilot feedback?",
      "when": { "mode": "all", "rules": [{ "questionId": "audience", "optionId": "pilot" }] },
      "options": [
        { "id": "named", "label": "Name one owner", "recommended": true },
        { "id": "later", "label": "Decide later", "defer": true }
      ]
    }
  ]
}
```

## Fields

| Object   | Required                                  | Optional / default                                                                                            |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Document | formatVersion, id, version, title, nodes  | description, sources [], locale en, direction ltr                                                             |
| Topic    | id, kind group, title                     | parentId null, description                                                                                    |
| Question | id, kind question, title, prompt, options | parentId null, example, revision 1, dependsOn [], when, tags []                                               |
| Option   | id, label                                 | description, benefits [], risks [], example, outcome, rationale, recommended false, defer false, sourceIds [] |
| Source   | id, title, kind, claim                    | url                                                                                                           |

Source kinds: `external` (link to actual source), `prior-decision` (recorded project decision), `analysis` (author's proposal/inference). A label is not independent verification. Use `claim` to explain exactly what the source supports; never imply a company endorses a custom proposal.

## Relations and conditions

- A node has zero or one parent. Multiple root topics are allowed. Node and source IDs are unique within their respective namespaces.
- IDs are 1–100 ASCII letters/numbers/periods/underscores/colons/hyphens, beginning with a letter or number. Reserved object-property IDs are rejected.
- A question has 2–30 options with unique IDs. At most one can be recommended. A deferral cannot be recommended.
- `dependsOn` requires other questions to be validly answered, regardless of the selected option.
- `when.mode: all` requires every referenced option; `any` requires at least one. Rules reference question IDs and option IDs.
- Structural question ancestors must be validly answered. Use a topic parent for independent peer decisions.
- Cycles, missing references, contradictory `all` rules and unsafe source links are rejected.
- Parent/condition structure is presentation plus applicability; explicit prerequisites are separate cross-links, optionally visible in the graph.
- Inapplicable answers are retained but excluded from progress. Changing earlier answers may mark them for review when the path returns.

Document limit: 5 MiB / 5,000 nodes; session import limit: 20 MiB. Every text field has bounds. Deep hierarchy validation is iterative, but renderer performance at extreme size is not guaranteed.

## Session envelope

Export includes `format: decision-tree-studio/session`, `formatVersion: 1.0`, `exportedAt`, the complete `document`, `session`, and computed `evaluation`. Session data includes recorded answer labels/definitions/dependency snapshots, drafts, note drafts, timestamps and node/edge annotations. Evaluation is recomputed on import. Unknown removed answers/annotation targets remain data for audit, not valid new questions.

Importing a document preserves the existing session with the same document ID. Importing a session restores its session explicitly. Local workspace format is separately versioned; do not edit localStorage by hand as an integration API.
