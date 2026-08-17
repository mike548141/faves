# Theme 26 — Saved orders: the usual (owner-raised 2026-08-16)

<!-- Numbered 26, not 25: a parallel session took 25 (dish ids) while this
     branch was open, exactly as the note on Theme 19 warns. Checked with
     `grep '^## Theme' ROADMAP.md` at merge, not at write. -->

**The ask, raw (owner):** *"Saved orders. For example saving an order for Subway
that I use each time."*

**What it is.** A named, reusable order for one venue — "my Subway" — recalled
into the tally in one tap instead of rebuilt dish by dish. The app already holds
every piece: `cart.js` is a local offline order model, `favourites.js` already
persists per-venue picks, and `share-codec.js` already serialises a whole order
to a URL fragment for group ordering. A saved order is that codec's payload,
kept locally under a name, rather than sent to someone.

**Why it is queued behind Theme 14, not beside it.** A saved order has to record
*what you actually order*, and for Subway that is nothing but add-ons — bread,
salads, sauces. Saving orders before add-ons exist would save a shape that is
about to change, then need a migration on a store that lives in people's
browsers where we cannot see it or fix it. Build 14a first, then save.

🔗 **Depends on Theme 25 (dish ids), and so does 14f.** A saved order and a
combo both need to *point at a dish* and still find it after a refresh. That is
the same question Theme 25 asks, arrived at from two directions — settle it once,
there, before either of these designs commits to a reference shape.
