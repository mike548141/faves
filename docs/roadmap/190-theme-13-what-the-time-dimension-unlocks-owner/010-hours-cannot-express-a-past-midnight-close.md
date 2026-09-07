- [~] 🛑 **`hours` cannot express a close after midnight, and the first venue
      that needs it is now in the corpus** `[M][js][schema]` — found 2026-09-07
      (session faves-24) while fleshing out Dragonfly from its own website.
      🔒 **CLAIMED 2026-09-07 (session faves-b1).**

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — OPTION 1, the wrapping
  close.** Put to him with all three options, their costs and a recommendation.
  He took *"Wrap when close < open"*: in `segments()`, a close earlier than its
  open means the next day. **The condition he approved carries its own caveat
  and it is binding**: it changes the meaning of data already on disk, so
  **every existing record must be checked for a span that would newly wrap —
  verified, never assumed.** The item's own text said there are none today;
  that sentence is a prediction, not evidence, and the sweep is part of the
  work. If the sweep finds one, that is a finding to report, not to fix by
  editing the record into agreement.
  ❌ Option 2 (`"24:00"`–`"29:59"` notation) and option 3 (accept the
  understatement) are **declined** — recorded so neither is re-proposed.

  **The mechanism, read rather than inferred.** `site/js/hours.js` `segments()`
  expands the week into absolute minutes:

  ```js
  const o = toMinutes(open);
  const c = toMinutes(close);
  out.push({ start: base + o, end: base + (c == null ? 1440 : c), … });
  ```

  For `["16:30", "03:00"]` that is `start = base + 990`, `end = base + 180` — a
  segment that **ends before it starts**. Nothing rejects it; `openStatus`
  simply never finds `now` inside it, so the venue reads **closed for the whole
  evening**. And `validate.py`'s `TIME_RE` is `^([01]\d|2[0-3]):[0-5]\d$`, so
  `"24:00"` is not expressible either — the latest representable close is
  `23:59`.

  🔎 **Why nobody hit it until now.** Before Dragonfly, **no record in the
  corpus had any past-midnight span and the latest close anywhere was 23:00**.
  This is the concrete instance of
  [`340/150`](../340-theme-20-places-from-anywhere-owner-raised-202/150-the-corpus-holds-no-degenerate-state-to-test-against.md)
  — *"the corpus is uniformly healthy, so a whole class of behaviour ships
  unexercised"* — arriving for real rather than as a hypothetical.

  📋 **What was done in the meantime, and it is a knowing understatement.**
  Dragonfly's real hours are Mon–Tue to 11pm, Wed–Thu to midnight, Fri–Sat to
  **3am**. The record uses a **`null` close** for Wed–Sat, which `hours.js`
  documents as *"open-ended: capped at midnight for 'is it open now' but
  carries closeMin=null so we show no countdown"*. That makes Wed–Thu **exactly
  right** and Fri–Sat **understated by three hours** — the app will say
  Dragonfly is shut at 1am on a Saturday when it is trading.
  🔑 **Understating was chosen over `23:59`** because `23:59` fabricates a close
  the venue never stated, and over `["16:30","03:00"]` because that is silently
  broken. An understatement is wrong in the direction that sends someone home
  early; a negative-length segment is wrong in the direction that says a place
  is shut all evening. Neither is good and the first is recoverable.

  🎯 **Options, none taken — this is a real feature, not a tidy-up:**
  1. **Let a close less than its open mean "next day"** in `segments()` —
     `end = base + c + (c <= o ? 1440 : 0)`. Small, and it makes the existing
     data mean what a reader already assumes. ⚠️ It changes the meaning of
     data already on disk, so every existing record must be checked for a span
     that would newly wrap (there are none today — verify, don't assume).
  2. **Allow `"24:00"`–`"29:59"`** as an explicit next-day notation. Unambiguous
     and self-documenting; costs a `TIME_RE` change and every consumer of the
     string form.
  3. **Leave it and accept the understatement**, documenting the cap in the
     venue record so nobody "fixes" it to `03:00` and breaks the evening.
  🚩 **Whichever is chosen it needs a `served_check`-style frozen-clock test**,
  because the assertion is *"at 1am on a Saturday this venue reads open"* and a
  check whose verdict depends on the hour gets switched off within a week.
