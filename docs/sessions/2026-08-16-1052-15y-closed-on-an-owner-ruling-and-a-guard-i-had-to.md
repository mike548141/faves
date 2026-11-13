## 2026-08-16 10:52 UTC — 15y closed on an owner ruling, and a guard I had to throw away

Owner: *"RE 15y I accept your recommendation."* The ⓘ disclosure is click-only
everywhere now — ADR 0059, `SHELL .62`.

The hover reveal was one CSS rule and it carried two faults: an infinite flicker
where the note sits in flow (fixed narrowly earlier the same day), and a **WCAG
2.2 SC 1.4.13** failure that the narrow fix's sweep turned up — not *Hoverable*
(the note vanished as the pointer crossed the margin toward it) and not
*Dismissible* (Escape was wired only on the click path). Deleting the rule
retires both, and the earlier flicker guard went with it: 23 lines of CSS out,
16 of comment in. Three options went to the owner rather than a quiet edit,
because going click-only is **not** the neutral choice — it trades a mouse
affordance for compliance, which is a fork to surface, not resolve.

### The guard I built, proved worthless, and deleted

The obvious regression test was a headless one: hover the ⓘ, assert nothing
appears and the button does not move. It passed on a clean tree. Then I put the
deleted rule back to watch it fail — **and it passed again.** A synthetic
`Input.dispatchMouseEvent` does not raise CSS `:hover` reliably in that harness,
even with `elementFromPoint` confirming the coordinates land on the button and
the viewport confirming they are on screen. Eight polled samples made no
difference.

It would have shipped reading as coverage while proving nothing — the sixth
instance of that pattern in this repo, and this time caught only because
breaking the fix on purpose is now habit. The invariant "no hover rule targets
`.caveat-note`" is a property of the **source**, so it is asserted against the
source (`tests/disclosure-css.test.js`), where it cannot be flaky; that version
fails loudly on the reintroduced rule. `device_check` keeps the half a browser
genuinely can prove — a click still opens and closes the note.

The general lesson, which is not about hover: **when a check cannot be made to
fail on demand, the check is the thing that is broken.** Do not reach for a
richer harness first; ask whether the property being tested is a property of the
render at all, or of the source.

### Concurrency

A peer session spotted my uncommitted `app.css` in the shared checkout and
challenged it correctly — *"did the owner rule?"* — because the diff read as
15y being quietly resolved rather than decided. He had ruled, one message
earlier. The challenge was right to make and cost nothing; a peer that queries
an unexplained working-tree change is the concurrency protocol working.

---

