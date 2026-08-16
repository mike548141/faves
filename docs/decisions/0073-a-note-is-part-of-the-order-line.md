# 0073 — A note is part of the order line, and a dropped note is not a safe failure

**Status:** accepted
**Date:** 2026-08-16
**Follows:** [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) §4 —
whose rule about what makes two order lines distinct is extended here rather
than reinvented ·
[0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md) — the identity component
this sits beside ·
[0009](0009-group-orders-share-urls-not-connections.md) — the share codec whose
versioning rule this deliberately does not break

## Context

The owner asked for *"the ability to customise a dish e.g. no tomato in a big
breakfast"* (Theme 14c, 2026-08-09). The roadmap weighed two shapes and
recommended one:

- **a free-text note per order line** — works everywhere, ships now, and is what
  you would say out loud at the counter;
- **curated removable components per dish** — structured and checkable, but
  restaurant dishes carry no ingredient lists at all (only Cook-at-Home recipes
  do), so it is the whole ingredient-transcription problem across 55 venues
  before a single "no tomato" can be expressed.

The note is what was built. Two things it forced a decision on were not settled
by that recommendation, and both are load-bearing.

## Decision

### 1. A note is part of line identity

`lineKey` gains a fourth component, after venue, dish id and add-on selection.
A note is normalised — trimmed, internal whitespace collapsed — and an absent or
empty note is `""`, so every line already in a family's browser keys exactly as
it did.

This is [0048] §4 applied consistently rather than a new rule. That ADR settled
that *a dish added twice with different add-ons is two lines, not a quantity of
two, because they are different things to make and different money.* A note is
the same class of fact: "eggs on toast, no tomato" and "eggs on toast" are two
different things to make. Had the note sat outside the identity, adding the dish
twice and then annotating it would produce **one line of quantity two carrying a
note meant for one of them** — wrong at the counter, and wrong in a way nobody
reading the tally would notice.

The cost this accepts: editing a note *moves* a line to a new key. So `setNote`
is a real operation rather than a field assignment — it preserves quantity and
collected state, and **merges** when the new key already exists (clear the note
on one line while a plain line of the same dish is present, and the two become
one line of the summed quantity). That merge is the case a naive implementation
gets wrong, by leaving two lines sharing a key.

🔎 **And it takes the note twice, which the design did not foresee.** The
signature specified for it was `setNote(venueId, id, sel, note)` — and that
shape is **not implementable**. Because the note is part of the identity, the
note is the only thing that can *locate* the line being edited, so a
single-note signature can address the un-noted line and nothing else: "change
'no tomato' to 'no onion'" is inexpressible in it. It ships as
`setNote(venueId, id, sel = "", from = "", to = "")`. The design was wrong and
the code was right, which is the ordinary case rather than the surprising one.

🚩 **A second thing identity-bearing notes broke, found only in a browser.**
The order sheet's ± control is the same `dishStepper` as the menu row, and it
addressed a line by `(venueId, dishId, sel)`. On a sheet showing "Eggs on
Toast" and "Eggs on Toast — no tomato" it therefore **operated the wrong
line** — the minus on the noted line decremented the plain one. The two
buttons were also indistinguishable to a screen reader, since their accessible
names were identical. Both are fixed, and `tools/note_check.mjs` exists mainly
because no unit test can see which line the DOM wired a button to.

### 2. The note travels in a shared order, appended, without a codec bump

`share-codec.js` packs each line as a positional array and has grown twice by
**appending a slot** rather than bumping `CODEC_VERSION` — because that version
is shared by orders *and* shortlists and checked with a strict `!==`, so a bump
invalidates every outstanding link of both kinds for a change one of them does
not use. The note follows the same pattern, as **slot 5**:

| slot | field | emitted when |
|---:|---|---|
| 0 | name | always |
| 1 | price (`null` when unpriced) | always |
| 2 | qty | always |
| 3 | options, or `null` | `opts.length \|\| carryId \|\| note` |
| 4 | dishId, or `null` | `carryId \|\| note` |
| 5 | note | note is non-empty |

**The placeholder rule: a later slot forces `null` into every earlier optional
one.** So a plain line is still exactly `["Mee Goreng", 18, 2]`, an id-only
line is still `[…, null, "cheeseburger-gold-card"]`, and a note-only line is
`["Eggs on Toast", 20, 1, null, null, "no tomato"]`. Both invariants are pinned
by tests, because "an old link decodes to exactly the object it always did" is
the whole justification for not bumping.

The note is capped at **`MAX_NOTE = 80`**, and the UI's `maxlength` is the same
constant, stated in the visible help text. The two caps *must* agree: if the UI
allowed more than the wire, a note typed on one phone would arrive silently
truncated on another. `cleanNote` is deliberately **duplicated** rather than
imported — the codec re-sanitises everything off the wire and does not depend
on the store — but a note normalised differently on the two sides keys as a
*different line* and silently splits an order, so a test runs both over one
table of inputs and asserts they agree.

## 🚩 The consequence worth recording, because the existing argument does not cover it

The codec carries an explicit justification for appending, and it is a **safety**
argument:

> *"a decoder that predates either slot reads `line[0..2]` and ignores the rest
> by construction … It under-specifies the order rather than mis-stating it:
> **dropping an add-on can never put something extra on a plate**, which is the
> only degradation direction that is safe."*

**That argument does not transfer to a note, and it must not be reused as if it
does.** An add-on is an *addition*; dropping it takes something off the plate.
A note is characteristically a *removal* — "no tomato", "no onion", "sauce on
the side". Dropping a removal leaves the unwanted thing **on** the plate. It is
the opposite degradation direction, and it is the unsafe one.

So this is the first slot appended to the codec whose loss is not fail-safe, and
the reasoning has to stand on something else:

- **Not carrying it is a guaranteed failure.** A group order whose notes stay
  device-local sends your friend to the counter to order you the exact dish you
  asked to have changed — every time, for everyone.
- **Carrying it fails only against a decoder old enough to predate the slot**,
  and both parties are running the same app.
- The residual risk is therefore bounded by service-worker staleness, which is
  a known and separately-guarded hazard here (`tools/check_versions.py`, ADR
  0015), rather than by an unbounded population of third-party readers.

That is a worse safety story than the two slots before it, and it is recorded
here rather than smoothed over. It is also the reason the UI copy steers the
note towards *what you will say at the counter* and away from being used as an
allergy field: **the note is checked by nothing.** The app has a real,
structured allergen system that composes across dishes and add-ons
([0048] §4, `site/js/addons.js`); free text sits outside all of it.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Note outside line identity | Produces one line of quantity 2 carrying a note meant for one of them. Silently wrong at the counter. |
| Curated removable components per dish | No ingredient lists exist for restaurant dishes. It is the transcription problem for 55 venues before "no tomato" can be said once. Still the right answer *if* a venue's data ever justifies it. |
| Note stays device-local, never shared | Guarantees the group-ordering failure this feature exists to prevent, for every user, rather than risking it against a stale decoder. |
| Bump `CODEC_VERSION` | Invalidates every outstanding order **and shortlist** link, for a change shortlists do not use. The existing rule is right; only its safety *rationale* needed extending. |

## Consequences

- `cart.js`'s addressing API takes a fourth optional argument throughout; a
  three-argument call still means "the un-noted line", which is what every
  existing call meant.
- A line with no note is byte-identical in storage to one written before this
  landed — the same discipline `dishId` follows.
- The note reaches the DOM as text a person reads, unlike the dish id, which
  reaches only a storage key. It is set with `textContent`, never `innerHTML`,
  and clipped and clamped off the wire like every other hostile string.
- 🚩 **Open, and named rather than assumed:** whether a note should be
  excluded from the backup export on the same reasoning that ticks are
  (*"if it isn't restored, it shouldn't be exported"*) has **not** been
  settled here. A note is restored — it is part of the order — so the rule
  points the other way, but the export path was held by another session while
  this was built and was not read. Check it before assuming.
