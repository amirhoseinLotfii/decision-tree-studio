# Contributing

Use Node 24.15+ and npm. Run `npm ci`, then `npm run check`. Keep the lockfile committed. Do not weaken lint/test rules to obtain a green check.

Keep domain evaluation independent of React, browser APIs and layout libraries. Add tests for a new condition, invalidation rule or state transition. Test import errors before testing success-only paths. Add English and Persian labels together.

Do not include private research, exported sessions, access tokens, commercial fonts or machine-specific paths. Examples must be fictional or properly licensed and attributable. Label author proposals separately from external claims.

Before opening a change, report: the user-visible behavior, files changed and why, commands and exit codes, tested/untested cases, and any compatibility or storage migration impact. UI changes require a real-browser check when available; do not describe DOM tests as a browser audit.

Prefer a focused change over a new dependency. For dependencies, explain the feature they enable, their license and why existing libraries are insufficient.
