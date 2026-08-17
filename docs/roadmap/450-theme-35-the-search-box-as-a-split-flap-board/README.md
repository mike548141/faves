# Theme 35 — the search box as a split-flap board (owner-raised 2026-08-16)

**The ask, raw (owner):** *"An idea in the main page search bar that alternates
the prompt text like 'Search a place -- Southern Cross' rather than a fade in
and out I am thinking maybe the text wipes from left to right or vice versa
character by character… Or an animation like the old airport signs where the
characters would flip continuously until they showed the letter required — I
quite like that idea if you can make it look good."* Reference photo supplied:
a Solari departure board mid-flip.

🎯 **Owner ruled 2026-08-16: roadmap it, finish the section-id build first.** He
was offered "build it now" and "prototype it, don't ship it" and chose neither —
this is queued, not shelved, and he can reorder at any time.

### 🔎 The finding that makes this smaller than it looks

**This is a transition swap inside a module that already exists**, not a new
feature. `site/js/search-hints.js` already rotates the placeholder through
example hints and already carries the hard parts:

| Already built | Where |
|---|---|
| Rotation with an injectable timer, fully unit-tested (247 lines of tests) | `search-hints.js`, `tests/search-hints.test.js` |
| `prefers-reduced-motion: reduce` pins to the first hint and **never starts a timer** | `search-hints.js` |
| Stops on focus and while the field has text — it cannot change under someone reading or typing | `search-hints.js` |
| Accessible name comes from the `<label>`, never the placeholder, so nothing retitles the field mid-interaction (WCAG 2.5.3) | `index.html:126` |
| The honesty rule: a hint may only advertise something the index can actually find | `search-hints.js` header |

So the work is **replace the 450 ms cross-fade (`.hint-fading` + a
`::placeholder` opacity transition, `app.css:452`) with a per-character flip**,
and leave every accessibility guarantee where it is. Sizing on that basis:
`[M][design]`, not `[L]`.

### 🚩 The one real obstacle, and it decides the shape

**You cannot animate inside a `placeholder` attribute.** It is a string, not a
DOM tree — there is no per-character element to flip, and `::placeholder` styles
the whole run. Two ways out:

1. **Rewrite the attribute every frame** — `input.placeholder = frameText`. Zero
   new DOM, works with the existing module almost unchanged. **Rejected on
   accessibility:** the placeholder is exposed to assistive tech, and churning
   it 20×/second is a screen-reader hazard the current design specifically
   avoids. It also fights the reo language toggle, which sets `placeholder` from
   `data-i18n-ph` (`reo.js:309`).
2. **An `aria-hidden="true"` overlay span** positioned over the input, with the
   real `placeholder` left as one stable string underneath. **Recommended.**
   Assistive tech and the reo toggle keep reading a calm, translated string;
   the flap is decoration that never enters the accessibility tree. Hidden the
   moment the field has focus or text, so it can never sit under a caret.

### What "make it look good" actually requires

- **Flip through a real alphabet, not random glyphs.** A Solari board steps
  A→B→C→… to the target letter, which is why it looks mechanical rather than
  glitchy. Uppercase-only is authentic and also sidesteps the descender jitter
  that makes mixed case look broken mid-flip.
- **Stagger, don't sync.** Every character starting and stopping together reads
  as a fade. A small per-character delay (each letter settling a few frames
  after its neighbour) is the whole effect.
- **Settle, then stop.** The animation must reach a resting state and cancel its
  frame loop — a permanent `requestAnimationFrame` on the home screen is a
  battery cost on the device this app is designed for. Also pause on
  `document.visibilityState !== "visible"`.
- **Two candidate texts, and they are different jobs.** The owner's example
  pairs a prompt (*"Search a place"*) with a venue name (*"Southern Cross"*).
  The existing hints are capability examples. Whether the board flips between
  those two kinds, or the venue names come from `index.json`, is a content
  decision worth making before the animation is tuned.

### Owner decisions this needs before it is built

- 🎯 **Uppercase-only, or preserve the venue's own casing?** Authenticity vs
  reading "SOUTHERN CROSS" for a place written "Southern Cross" everywhere else
  in the app.
- 🎯 **Does the board flip venue names from the collection**, or only the
  capability hints it shows now? Naming real venues is a nice touch and it makes
  the placeholder content depend on data the home screen already loads.
- 🎯 **What does a reduced-motion reader get?** Recommendation: the current
  behaviour exactly — the first hint, static, no timer. That is already what the
  module does, so this is a confirmation rather than work.

### Out of scope unless asked

The same treatment on the menu-page search box (`Search this menu…`). One
animated placeholder is a flourish; two is a tic, and the menu box is used
mid-task where the home box is used on arrival.

---
