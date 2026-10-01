# 0155 — A branch that is anywhere says so as a value

**Status:** accepted
**Date:** 2026-10-02
**Follows:** [0011](0011-multi-location-venues.md) (branches) ·
[0103](0103-a-branch-has-an-id-and-its-position-is-not-it.md) (a branch's id) ·
[0091](0091-the-distance-limit-cuts-the-list.md) (the distance cut, unchanged here)

## Context

The owner ruled on 2026-09-08 (roadmap `470/050`) that Cook at Home uses the
venue/branch structure, and that *"the current 'Cook at home' is the
equivalent of a restaurant with a single branch. That branch should match any
address or GPS coordinate so that it can be used by anyone i.e. its a public
record."* Private branches (one per house, on the reader's own device) come
later and are not part of this record.

Three things were already true. Every branch needed `address` as a non-empty
string (`validate.py`). `null` or a missing field already meant "nobody has
captured this yet", and twelve venues use that meaning today. And CLAUDE.md
says no person's home address may appear anywhere, which matters more here
because a recipe collection's branches are houses.

So the public branch has to say "everywhere" in a way no reader can mistake
for "not captured yet". It must also give a renderer nothing to print as a
street and nothing to send to a map.

## Decision

1. **The wildcard is a declared value in the address slot:**
   `"address": { "anywhere": true }`, exactly that: one key, the boolean
   `true`. `validate.py`'s `is_anywhere` and `locations.js`'s `isAnywhere`
   accept exactly this value and nothing else. Python checks with `is True`,
   because `1 == True` would otherwise let `{"anywhere": 1}` through.
2. **Only a recipe collection may use it**, and a recipe collection's shipped
   branches must use it. A restaurant branch declaring "anywhere" would hide
   a missing address behind an answer. A real street on a Cook at Home branch
   is a house's address in the public payload, which is the hard rule.
   `validate.py` refuses both.
3. **A wildcard branch carries no `lat`, `lng` or `phone`.** A coordinate pins
   it to one point, and a distance from that point would be a number about
   nowhere. A phone at "anywhere" rings nobody, and a home number is personal
   data. All three are refused.
4. **Near-miss spellings are refused, not accepted as streets.** Any other
   object is refused. So is a string that, once its non-letters are removed,
   reads as an attempt at the wildcard: `"anywhere"`, `"Anywhere"`,
   `"everywhere"`, `"*"`. A string with no letters at all also lands here,
   since no real address has none.
5. **The raw object never reaches a renderer.** `data.js`'s one normalisation
   seam passes each branch through `locations.normaliseBranch`, which turns
   the wildcard into `address: null` and `anywhere: true`. This happens before
   the primary branch is projected to the top level. Every existing "is there
   an address?" check then answers no. The few readers that must tell
   "everywhere" from "unknown" ask `isAnywhereBranch`: the home card's area
   label, and whether a stub is worth opening (`hasPlaceDetails`). The home
   summary keeps the flag (`gen_summaries.mjs thinBranch`) because it drops
   the address. As a second guard, `branchAsPlace` hands a map only a string
   address.
6. **The sort and the distance cut are untouched.** The wildcard has no
   coordinate, so its distance is `Infinity`. The coordless record measured
   the same before the branch existed. Measured over 60 scenarios (3 instants
   × 5 origins × 2 limits, on both the summary and the full records): the
   home list's order, the cut, and Cook at Home's position and distance are
   identical before and after.

## Rejected

- **An absent field** (no `address` on the branch). It already means "not
  captured" on every other branch, so the declaration and the gap would look
  the same. The validator could only allow it by loosening the rule that
  catches real gaps.
- **`null`.** Same problem: `null` is the corpus's spelling of "we don't know".
- **A word or a glob as a string** (`"anywhere"`, `"*"`). Every reader that
  checks "is there an address?" would say yes. It would render as a street and
  become a maps search for the word. Worse, a misspelling is still a valid
  string address, so the gate could not tell the typo from a street. With an
  object, any misspelling is a wrong type and is refused.
- **A fake or representative address** (a city centre, the owner's suburb).
  It is false for every reader but one, and for that one it moves toward the
  hard rule.
- **A separate `anywhere: true` key with no address.** It reads well, but the
  address field is still absent and means "not captured" to every reader that
  does not know the new key. That is decision 5's problem without decision
  5's seam.

## Consequences

- Cook at Home's record now carries `locations: [{ label: "Anywhere", id:
  "anywhere", address: { anywhere: true } }]`. The id was seeded by
  `tools/seed_branch_ids.py`. With one branch, nothing on screen changes. The
  recipes kind has no contact card, no hours and no distance on its card. The
  home list and the menu page look as they did, which `distance_check.mjs` now
  asserts in a browser.
- `test_validate.py` mutates the real record: the accepted wildcard, seven
  near misses, coordinates and a phone alongside it, a real street, an absent
  address and a null address. It also puts the wildcard on a restaurant's
  branch (Pandan).
- `tools/audit_coords.py` skips the wildcard, which has no pin to audit.
- **Not decided here, and owed to the owner:** whether a wildcard branch should
  *sort at the reader's own position* (distance 0) instead of having no
  distance. This was a session's reading of the ruling (470/050's 📎), not
  the owner's words. Today it makes no visible difference: Cook at Home is
  pinned first by kind and its card shows no distance. It starts to matter
  once private branches have real coordinates beside the wildcard.
