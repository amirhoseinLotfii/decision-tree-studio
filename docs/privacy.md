# Privacy and data safety

Runtime application code has no API requests, accounts, analytics, telemetry or AI calls. Fonts are bundled locally. Opening an external source link deliberately navigates to that source. The development server may use its normal Vite live-reload connection.

Browser storage is local to an origin, browser and profile; it is not encrypted, not a secure vault, not a cross-device backup and not guaranteed permanent. Other scripts running on the same origin can access it. Use a trusted deployment origin and do not store secrets here.

Exported sessions include the entire document, answer history snapshots and notes. Review the output before sharing. No automatic sanitization or redaction is promised.

On invalid storage, the application preserves the original value and offers a recovery download. A failed write stops further writes for that visit and shows a warning. You can keep working in memory and export. Resolve quota/corruption outside the app only after backing up data.

No multi-tab merge/conflict resolution is implemented. Use one editing tab per workspace. An incognito session or cleared site data can remove local work. Session reset affects only the active document; it is undoable until history is cleared or the page reloads.
