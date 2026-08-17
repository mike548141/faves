# Theme 29 — things pinned over the menu (owner-raised 2026-08-16, from a phone)

- ✅ **The "Call to order" button looked cut off** — **fixed 2026-08-16**;
  3px of clearance under a pinned 44px button became 11.5px, measured in a
  real browser. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
✅ **Both items — SHIPPED 2026-08-16** (`f619722`). Detail →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
🔎 **Measured properly, it was worse than it looked, and the measurement chose
the fix.** A full-document sweep in 37 px steps at two widths and two text sizes
— because a fixed control's victim depends entirely on where you stop, and a
single sample is what every eyeball report of this had been. The back-to-top
button owned the tap on a dish price at **100%** of its width, **0 px
reachable**, at **96 of 547 scroll positions** on one menu; on the home screen it
covered **94.6%** of a venue's heart at 1280/24px, leaving 2.6 px.
**The roadmap offered two fixes and only one of them was live.** End padding was
*already sufficient* — at the document end the button overlapped nothing in all
eight width × text-size combinations, before and after. Every bit of the damage
was mid-scroll, which only "let the control get out of the way while the list is
moving" reaches. It now tucks while you scroll down, returns when you scroll up,
and **starts tucked**, so a deep link never opens with a button over a price.
⚠️ **Residual, stated rather than buried:** flick *up* and it returns and still
overlaps (91.8% worst). Unavoidable for any visible fixed control at 390 px —
there is nowhere for it to go that is not over the list. It now happens only
while the page moves upward, never during a downward read and never at rest.
Also fixed: the `Faves` wordmark was 81.7 × 31.9 px; now 44.
