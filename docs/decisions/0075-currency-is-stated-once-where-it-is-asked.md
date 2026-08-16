# 0075 — Currency is stated once, on the screen where the question occurs

**Status:** Accepted. Supersedes **§3 only** of
[ADR 0037](0037-confidence-reads-both-ways.md).

**Date:** 2026-08-16

## Context

ADR 0037 §3 decided currency is *"stated twice, in the two places it is asked
about — the per-venue ⓘ, and the About dialog."* That was the right call **at the
time**, and the reason is worth stating plainly rather than treating the old
decision as careless: the ⓘ did not always say it. `caveatDisclosure` renders in
two tones, and only the blue one carried a currency line. About was the backstop.

ROADMAP 23c then arrived from the owner, about a different screen: *"We have this
feature in settings but the version details sit in the about screen? Makes no
sense for UX."* With it came the general instruction — *"ALWAYS keep front of
mind what the user is trying to achieve as an outcome"* — and 23a's task of
finding each About block its right home. About's Prices block was listed as a
strong candidate for deletion on the grounds that it duplicated the menu page.

**Checking that duplication claim is the substance of this record.** It was
false as stated, and deleting on it would have destroyed a fact. Applying
`refreshCaveat`'s own rules across the corpus: **39 of 55 venues render in the
amber tone**, whose text never mentions currency. For 71% of venues About was the
*sole* statement of it. 🔑 **A duplication claim is a measurement, not a
reading** — and this one came back the other way round.

## Decision

**1. Both tones of the per-venue ⓘ carry the currency line.** The amber tone
gains `currencyLine` on its own row, exactly as the blue tone already had it. The
gap that made a second home necessary is closed at its source.

**2. About says nothing about prices or currency.** With the ⓘ complete, a
second statement is not a backstop, it is the split that ROADMAP 23c objects to —
one outcome ("am I reading this price right?") answered on two screens reached by
two different routes.

**3. The test for where a fact lives is the outcome the reader is chasing, not
whether the fact is *about* the app.** That is the owner's own framing and it is
what makes About a short statement of what Faves is rather than a FAQ. Currency
is asked with a price in front of you; it belongs beside the price.

## Consequences

**The fact is now stated in MORE places than before, not fewer** — 55 venues
rather than 16 — while appearing on one screen instead of two. The order of
operations was load-bearing: close the amber gap first, delete About's copy
second. Reversed, it is a regression for 39 venues.

**ADR 0037's other sections stand, including the rest of §3.** Its rejection of
appending "NZD" to ~1,200 individual prices — *"cost every reader legibility to
answer a question almost none of them are asking"*, the owner's own framing — is
untouched and this record agrees with it. Only the **second** of §3's two homes
is superseded: the About dialog, *"for whoever goes looking for a fact about the
site rather than about a venue"*. That reader is the one Theme 23 found does not
exist on that screen.

**`boot_check.mjs` guards it, tone-agnostically.** It asserts the ⓘ names the
currency whichever tone it renders in, and pins a second menu screen to a venue
whose menu has deliberately never been re-read (`kk-malaysian`) so the amber path
is exercised rather than assumed. Tone-agnostic by design: an assertion that
depends on which tone a venue happens to be in today rots with the calendar.

**And it guards About by name.** `boot_check` now asserts About's group list
explicitly, so the sediment Theme 23 exists to clear cannot re-form silently —
a new block cannot arrive without failing a check.

## Rejected

**Keeping About as a second home.** Defensible, and it honours 0037 as written
with no new record. It re-creates precisely the split 23c exists to end, and it
loses the main body of 23a. Put to the owner with that cost stated.

**Deleting About's Prices block without closing the amber gap** — what the
roadmap item literally proposed. It would have removed the only statement of
currency for 39 of 55 venues, and every check in this repo would have stayed
green, because no gate asserted the fact was reachable at all. That is why the
guard above is part of this decision and not a follow-up.

## What a green run does not show

Whether anyone reads the ⓘ. Moving a fact to the screen where the question
occurs is an argument about where attention is, and this repo has no way to
observe attention — deliberately, since it ships no analytics. The evidence here
is that the fact is now *reachable* everywhere it applies; that it is *read* is a
claim nobody in this repo can make.
