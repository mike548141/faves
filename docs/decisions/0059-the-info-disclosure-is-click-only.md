# 0059 — The ⓘ disclosure is click-only, on every input

**Status:** accepted
**Date:** 2026-08-16
**Supersedes in part:** the hover reveal added alongside `disclosure()`; the
control itself, its click path and its styling are unchanged.

## Context

`site/js/disclosure.js` builds the ⓘ used by the Settings allergen caveat, the
menu's freshness note and the "needs a fact" note. Its **click** path has always
been sound: Escape closes it, an outside click closes it, `aria-expanded`
tracks. It also carried a mouse-only hover reveal, one CSS rule:

```css
@media (hover: hover) and (pointer: fine) {
  .caveat-btn:hover ~ .caveat-note { display: block; }
}
```

Two separate faults came out of that rule on 2026-08-16.

**The flicker.** Inside the Settings dialog the note is `position: static`, so
it sits in normal flow — a change made that morning so the sheet's scroll box
could not clip it. Revealing it there grows the sheet; the sheet is
`margin: auto`, so it grows in both directions and the ⓘ rises **54px** (measured
in headless Chrome) out from under a pointer that never moved. That un-hovers
it, hides the note, shrinks the sheet, and puts the ⓘ back under the pointer.
An infinite loop, pure CSS, invisible to all four headless checks because none
of them hovers anything. Fixed at `97e12d9` by switching the reveal off for the
in-flow case only.

**The accessibility failure, found by the sweep that fix prompted.** The rule
fails **WCAG 2.2 SC 1.4.13 "Content on Hover or Focus" (Level AA)** — the bar
`CLAUDE.md` calls non-negotiable — on two of its three requirements:

- **Hoverable** ❌ the rule keys on the *button*, and `margin-top: var(--space-1)`
  puts a gap between button and note. Move the pointer toward the note to read
  it and the note disappears. Text you cannot travel to is text a slow reader, a
  magnifier user or anyone with a tremor cannot finish.
- **Dismissible** ❌ `setOpen()` attaches the Escape handler only when the note
  is *clicked* open, so a hover-revealed note cannot be dismissed without moving
  the pointer — which matters most for the magnifier user it is covering
  content for.
- **Persistent** ✅ nothing times it out.

## The decision put to the owner, and what he ruled

Three options were put to him with a recommendation, because the fix was a
design call rather than a defect with one right answer — and because **going
click-only is not the neutral option**: it removes an affordance mouse users
currently have, trading one group's convenience for another group's compliance.

1. **Close the gap** so button and note form one continuous hover target.
   Cheapest structurally, but it changes the note's visible box — a shipped
   component's appearance.
2. **A transparent bridge** (`.caveat-note::before` spanning the gap) plus a
   hover-path Escape handler in `disclosure.js`. No visual change, more
   machinery, and two code paths to keep in step forever.
3. **Drop the hover reveal.** One ⓘ behaviour across the whole app; mouse users
   lose a nicety that never existed on a phone.

**Recommendation: 3.** **Owner ruled 2026-08-16: _"RE 15y I accept your
recommendation."_**

## Decision

Delete the hover reveal. `.caveat-note` shows only via `.is-open`, which only a
click sets. Every ⓘ in the app now behaves identically on touch, mouse and
keyboard.

The flicker guard added at `97e12d9` goes with it — with no hover reveal there
is nothing to guard, and the special case for the in-flow settings note
disappears. Net effect is 23 lines of CSS removed for 16 of comment.

## Rejected

- **Option 1** — changes a shipped component's geometry to fix a rule we were
  about to delete anyway.
- **Option 2** — buys back a mouse-only nicety at the price of a permanent
  second code path, in a control whose whole value is that three surfaces share
  one behaviour.
- **Leaving it and documenting the failure.** AA is stated as non-negotiable in
  `CLAUDE.md`; a documented AA failure on a control that carries **allergen**
  copy is not a trade this repo makes.

## Consequences

- Mouse users tap the ⓘ instead of pointing at it. The button already carries a
  44px target and `aria-expanded`, so nothing else changes for them.
- SC 1.4.13 no longer applies: it governs content shown on hover or focus, and
  this content is now shown on neither.
- **The regression risk is that a later session re-adds hover as a kindness**,
  and "mouse users get a preview" is a reasonable thing to want. Guarded by
  `tests/disclosure-css.test.js`, which fails if any `:hover` rule targets
  `.caveat-note` again. `tools/device_check.mjs` keeps the complementary half —
  that a click still opens and closes the note.
  ⚠️ **The obvious guard was built first and thrown away, and the reason is
  worth keeping.** A headless check that hovered the ⓘ and asserted nothing
  appeared **passed with the deleted rule put back**: a synthetic
  `Input.dispatchMouseEvent` does not raise CSS `:hover` reliably in that
  harness, even with `elementFromPoint` confirming the coordinates land on the
  button. It read as coverage and proved nothing. The invariant is a property
  of the source, so it is asserted against the source, where it cannot be
  flaky. (Sixth instance of the decorative-guard pattern in this repo.)
- Do not re-add a hover reveal to `.caveat-note` without superseding this ADR.

Builds on [0025](0025-settings-index-and-panels.md) (the dialog the flicker
appeared in) and [0037](0037-confidence-reads-both-ways.md) (the ⓘ's
second tone).
