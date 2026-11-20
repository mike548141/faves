- [x] ✅ **28c — A section's time window is unreadable prose** — **DONE
  2026-08-16** (wt: faves-schema30), [ADR 0081](../../decisions/0081-a-serving-window-annotates-it-never-filters.md).
  `served` on a section, in exactly the shape of a venue's `hours`, so
  `hours.js`'s week reasoning applies unchanged and there is one engine rather
  than two (`segments()` exported, not copied). One extension: a null `open`
  means "from opening", because *"served till 2pm"* states no start and writing
  one would invent evidence. **It annotates; it never filters** — the argument
  that settles it is that `#section-<id>` is a real anchor (ADR 0058), so a
  filtered section makes a link someone was *sent* work at 1pm and fail at 1am,
  the direct negation of Theme 34. 4 of 5 sections structured; 1841's Mains
  left as prose because it restates the venue's own hours. Gold Lining's
  weekend rows set to `[]` — the venue is closed Sat/Sun and a section must not
  claim more than its venue does. `tools/served_check.mjs` drives it on a
  **frozen clock**, 55 assertions, and eight reintroduced defects were each
  caught. 🔎 **Two of those exposed decorative assertions in the new check
  itself:** opacity *composites* rather than inherits, so a dimmed ancestor read
  as 1.0 and the defect passed silently; and filtering the section out produced
  a harness timeout with no FAIL line. Both fixed before the check was trusted.
  the one clean, self-contained defect here. `available` accepts dates and
  seasons only, so "Mon–Fri 11:30–17:30" is **inexpressible**.
  ⚠️ **The next clause was stale and is corrected here: ZERO sections cram a
  time window into the section NAME.** ADR 0057 moved every one of them into
  `note` on 2026-08-16 — eleven lines below this item, 28d/28f are marked done
  for doing exactly that. The real figure is **5 sections in 4 venues carrying a
  window as prose in `section.note`** (`1841-bar-restaurant` mains + brunch,
  `gold-lining-cafe` all-day-brunch, `sprig-and-fern-tawa` gold-card,
  `the-borough-tawa` brunch). So 28c adds a field beside `note` and needs no
  name migration at all — it is smaller than it was written. It remains true
  that exactly one section in the
  corpus uses `available` at all. `hours.js` already does weekday+interval
  reasoning for the venue's own opening hours — the machinery exists and the
  section schema cannot reach it. Consequence today: nothing checks the clock,
  so a Gold Card price shows at 9pm on a Sunday with no indication it is not
  available.
