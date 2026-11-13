- **2026-08-08 (allergen tag sweep — Opus 5 session, wt: faves-allergen-tagging)**:
  The owner ruled on the two safety flags raised when the Churton menu landed,
  and both turned out to be fleet-wide rather than one record's problem.
  🛑 **Satay carried no peanut tag unless a menu printed the words "peanut
  sauce".** KK Malaysian, Thai Tara and Hell Pizza did, so theirs was tagged;
  R & S, Churton and KC Cafe didn't, so theirs wasn't. The app already
  asserted "satay = peanut" — inconsistently, decided by how verbose a
  menu-writer was — which meant a peanut-allergic reader browsing a venue
  *called* Satay Noodle House saw no warning on any of its 10 satay dishes.
  **Shellfish tagging was inconsistent inside single records** (Battered
  Mussel tagged, Prawn Cutlet not) across 8 venues.
  **100 tags applied**, in two tiers kept distinct by
  [ADR 0024](../decisions/0024-derived-allergen-tags.md): **64 STATED** (the menu
  names the ingredient — including **oyster sauce**, oyster extract and a
  widely missed exposure) and **36 DERIVED** from a closed, enumerated rule set
  (satay → peanut, unnamed "seafood" → shellfish, laksa → shellfish). A dish
  the venue calls vegetarian stands the derived *shellfish* rules down; satay
  is exempt from that carve-out, because "Vegetarian Satay" is exactly the dish
  someone would assume is safe.
  🔎 **The dry run earned its keep twice.** "Add chicken, halloumi, prawns or
  beef +$7" is a paid extra, not an ingredient — it would have flagged four
  Sprig + Fern dishes containing no shellfish at all. And the first apply
  round-tripped the JSON, reformatting hand-maintained files and turning 100
  tags into a 3,400-line diff; reverted and rewritten to patch the tags arrays
  in the raw text (99 insertions instead).
  **The UI copy changed in the same commit** — it said "We only show what
  venues told us", which the derived tier makes false. Shipping derived tags
  under the old wording would have been the quiet kind of dishonesty.
  `tools/tag_allergens.py` is re-runnable, additive-only (a venue correction
  always wins) and now warns from `validate.py`, because this gap was created
  by hand-tagging record by record.
  ⚑ **Deferred, recorded as ADR 0024's rejected alternative**: a `may-contain`
  tier showing readers *which* tier a tag came from. Right in principle;
  touches the vocabulary, the render and the avoid-matching, all
  safety-critical.
  🚩 **Concurrency**: a live session held uncommitted work in `settings-ui.js`,
  `data.js`, `app.css` and a new `temporal.js` (ADR 0023), so this ran in a
  worktree off `origin/main` and landed as a fast-forward. It touches
  `settings-ui.js` in one place — the allergen disclosure string — which that
  session is rewriting; whoever rebases must keep the new wording.
  Verified: semantic diff vs HEAD proves only tags changed and none were
  removed (0 files differ beyond tags, 100 added); the new validate warning
  fires when a tag is removed; validate 31 files; node --test 320 pass;
  no-deps; SBOM; floor green; CI green at `963fe9c`; live site serving
  DATA .82 with all 10 R & S satay dishes tagged.
