# Visual system

The canvas stays charcoal with a restrained mint gradient. Mint is reserved for primary actions and recorded states; questions use neutral surfaces, conditions and sources use blue, risks/review use amber. Excluded branches fade but retain readable full explanations in their dialog. Color is supplemented by text and icons.

Vazirmatn Variable is self-hosted for both Persian and Latin text. UI text uses 13–14px; question prompts 19–23px; sources/codes use smaller secondary typography. Long explanations wrap. The graph's short card title is clamped; the dialog contains the full text.

Dialogs use Radix semantics, Escape/outside-click dismissal, focus trapping and close controls. Only the content scrolls; the header remains visible. The narrow layout stacks tradeoff cards, wraps toolbar controls and hides the minimap. The list offers an alternative to navigating a dense graph.

Motion handles modal/sidebar entrance/exit, selected-option transitions, button press feedback, note badges and notifications. OS reduced-motion and the application animation preference suppress movement and timing. CSS transitions also respect OS reduced-motion.

Automated DOM tests are not visual proof. Manual narrow-screen, zoom, contrast, touch and screen-reader testing remains required before a production accessibility claim.
