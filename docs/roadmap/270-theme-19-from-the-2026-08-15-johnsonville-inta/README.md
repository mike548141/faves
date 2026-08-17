# Theme 19 — from the 2026-08-15 Johnsonville intake

<!-- Numbered 19, not 17: the 2026-08-15 session first appended this block as
     "Theme 17" without checking, colliding with Cook mode. Found and renumbered
     the same day. Check `grep '^## Theme' ROADMAP.md` before adding one. -->

✅ **Done 2026-08-15** — street numbers, hours, phones and house-level pins for
the three new venues; Thai Tara's *Prawns twister* restored with a null price.
Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **Thai Tara's leaflet-vs-card conflict — ruled 2026-08-15.** Owner's rule for
any two menus that disagree: **the dine-in card wins on contradictions** (prices,
dish numbers), and **dishes are additive** — anything on either menu is in.
Applied; detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **Pandan's Press Hall hours — ruled 2026-08-15**: use the food hall's own
hours. Applied as **Mon–Fri 11:00–15:00**, the house standard it publishes.
Two consequences recorded rather than buried:
- **Weekends are the hall's silence, not a stated closure.** It publishes
  weekday hours only. They are stored as closed, which is the safe direction —
  a false "closed" hides the branch, a false "open" sends someone into town.
- **The venue's `detailsVerifiedBy` dropped to `third-party`.** The address and
  phone are Pandan's own, but these hours are the *building operator's*
  statement about its premises, and the venue-level field must read as weakly as
  its weakest input. The 🚩 below is the real fix.

> ✅ **Per-branch details provenance — DONE 2026-08-16** (`434f6b1`,
> [ADR 0063](../../decisions/0063-details-provenance-belongs-to-a-branch.md)). Branch
> wins, venue is the default, and the date/method pair moves whole. Unblocks the
> McDonald's/Subway third-party hours capture. Per-kind ageing deliberately
> **not** built — the shape is ruled, the numbers still cannot come from this
> corpus. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
(`c2e07fc`). 🔎 **The finding was bigger than the item.** The "fluent-speaker
review queue" that ADR 0037 and this file have both pointed at for weeks **did
not exist anywhere** — not a file, not a convention, not a list. It exists now, as
[`reo-review-queue.md`](../../reo-review-queue.md).
🚩 **And the obvious home for a draft was unsafe.** An `MI` entry marked
`// draft` is **not inert**: `translate()` renders it the instant a reader flips
the language toggle. For a nav label that is a fair trade; for the confidence and
caution copy — which tells a reader how much to trust a price — an unreviewed
draft that reads slightly wrong can cost someone money or a wasted trip.
⚠️ **The second attempt was wrong too, and measurement caught it:** an inert
export at the end of `reo.js`, never imported, cost **+2,171 bytes gzipped
shipped to every phone** for content nothing renders. ADR 0047's rule meets a JS
module. The deciding argument is neither of those, though — **a fluent speaker
reviewing te reo will not open a JavaScript module**, which is how a queue comes
to be empty and unnoticed at the same time.

---
