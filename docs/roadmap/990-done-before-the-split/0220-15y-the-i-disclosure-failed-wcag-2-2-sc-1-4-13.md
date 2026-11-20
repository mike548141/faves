- [x] ✅ **15y — the ⓘ disclosure failed WCAG 2.2 SC 1.4.13 on its hover path**
  ([ADR 0059](../../decisions/0059-the-info-disclosure-is-click-only.md), `SHELL .62`).
  One CSS rule — `.caveat-btn:hover ~ .caveat-note` — carried two faults. It was
  not **Hoverable** (the rule keyed on the button, and `margin-top` put a gap
  between the two, so moving the pointer toward the note to read it made the
  note vanish) and not **Dismissible** (`disclosure()` wires Escape only on the
  click path). It had separately produced an infinite flicker in Settings, where
  the note sits in flow: revealing it grew the centred sheet and moved the ⓘ
  **54px** out from under a stationary pointer.
  Three options went to the owner — close the gap, bridge it with a transparent
  `::before` plus a hover-path Escape handler, or delete the reveal — because
  going click-only trades a mouse affordance for compliance rather than being
  the neutral fix. **He accepted the recommendation** and the reveal is gone,
  taking the earlier flicker guard with it. 23 lines of CSS out, 16 of comment in.
  🔎 **The regression guard is in `tests/disclosure-css.test.js`, not in a
  browser, and that is the lasting finding.** The headless version — hover the
  ⓘ, assert nothing appears — was built first and **passed with the deleted rule
  put back**: a synthetic `Input.dispatchMouseEvent` does not raise CSS `:hover`
  reliably in that harness. It read as coverage and proved nothing. When a check
  cannot be made to fail on demand, the check is what is broken; ask whether the
  property is one of the render at all, or of the source.
