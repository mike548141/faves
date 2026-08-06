# Family-texture review — pre-public gate (Theme 8)

- **Date:** 2026-07-28 (UTC)
- **Reviewer:** Fable 5 review session (scoped, per `docs/MODEL-ECONOMICS.md`)
- **Ruling:** owner, 2026-07-24 — "do a full family-texture review before
  public"; sweep docs + site data + tests for family first names and decide
  the whole set together. This record is the inventory and recommendation;
  **every decision below stays the owner's.**

## Method

1. Full-tree `leakscan --require-terms` (atelier scanner, structural rules +
   the owner's local term list — the list that is invisible to CI).
2. Word-boundary, case-insensitive sweep of every tracked file for the
   household/family first names and surnames the reviewer knows of, plus
   age/birth markers and personal-address shapes.

Structural findings (NZ addresses, phones, coordinates) are all restaurant
business data — expected product content, out of scope here. Local-term
findings and the name sweep are the review's subject. Names on the owner's
local leakscan list are deliberately not spelled in this record (the floor
scans staged lines); they are pointed at by file:line instead.

## Inventory

### A. Site data — recipe attributions (served publicly today)

`site/data/restaurants/cook-at-home.json`:

| Line(s) | Item | Note |
|---|---|---|
| 19, 250 | Booth's Ginger Crunch | inside the 2026-07-06 family-attribution approval |
| 463 | "A Clements family dessert since the early 1980s" | inside the approval |
| 20, 109 | Shane's Ribs | **first name of someone outside the immediate family** — the written exception covers *family* attributions |
| 82 | Jesse's Garlic Chicken Thighs | same — outside the written exception |
| 267 | B's Dope-As Brownie | initial only — no concern |

### B. Tests (published with the repo; not user-facing)

- `tests/profiles.test.js` — profile-name fixtures: Ruth ×11, Booth ×6, and
  at lines 162–163 the fixture name the owner's leakscan list flags (the
  concrete trigger for this review, added `5dfda33` 2026-07-22). Also
  derived strings `boothdata`, `ruth-fav`.
- `tests/ratings.test.js` — Ruth / `p-ruth` ×5.
- `tests/share-codec.test.js` — share labels Ruth ×4, Booth ×2.
- `tests/favourites.test.js`, `tests/search.test.js` — "Shane's Ribs"
  fixtures (mirror the site data; follow whatever call A gets).

### C. Docs and shipped comments (workshop-note texture)

- `CHANGELOG.md:174,187` — "Add Ruth's 6 items?" feature examples.
- `docs/ROADMAP.md:513` — "Ruth shares her …" (Theme 10 example).
- `docs/ROADMAP-DONE.md:49,92–93`, `docs/SESSIONS-ARCHIVE.md:728,740,824,837`
  — same example style in closed records.
- `CLAUDE.md:87` — the exception's own wording quotes "Booth's Ginger
  Crunch" / "a Clements family dessert".
- `site/js/cart.js:6` — code comment naming ("Booth", "Ruth"). Note this
  file **already ships on the live site**.

### D. Home-area texture (place names)

The suburb term on the owner's local list is a real place name carried by
four venues' data, `site/index.html` fallback cards, `docs/STRATEGY.md:63–64`,
and test fixtures — product content, consistent with the 2026-07-12
assessment (home-area inference no worse than the live site already allows).
One soft spot: `site/js/route.js:137`'s comment says "on the way home to
[that suburb]" — the only place the repo *says* home is there rather than
implying it.

### E. Not found anywhere (tracked tree)

No other household first names or surnames; no ages, birthdays, or
birth-year markers; no personal addresses; `intake/` tracks only its README
and `.gitkeep` (owner-supplied scans stay untracked). Total whole-word count
of the three family first names in play: 44.

## The history caveat (applies to every option)

Going public publishes **history**. Editing any instance now makes it
historical, not gone — same stance as the Theme 8 PAT item (refresh the
credential, don't redact the log). A history rewrite would break the doctrine
pin, the SBOM trail, and every recorded SHA, for first-names-only texture;
not recommended. Decisions below are about the *current tree* and the
go-forward texture.

## Recommendations (reviewer's, for the owner to rule on)

1. **Tests — rename the profile-name fixtures to neutral names** (e.g.
   Alex/Sam/Jo). Zero product cost, removes the leakscan-flagged name and
   most family texture from the published tree. Mechanical; an Opus session
   applies it.
2. **Shane's Ribs / Jesse's Garlic Chicken Thighs — owner confirms** the two
   people are happy with first-name attribution on a public site (or renames
   the dishes). The family-attribution approval as written doesn't cover
   them; extending it is a one-word ruling if the owner so decides.
3. **Booth / Clements attributions — keep** (already approved 2026-07-06,
   already live).
4. **Docs examples (C) — keep in closed records** (ROADMAP-DONE,
   SESSIONS-ARCHIVE; history retains them regardless and they're the texture
   the owner already approved for the site), but **neutralise the two live
   spots cheaply**: the `cart.js` comment and, if desired, the CHANGELOG /
   ROADMAP Theme-10 examples. CLAUDE.md's quoted exception wording stays —
   it quotes a dish that is deliberately public.
5. **route.js comment — reword** "home to …" → "toward …" (one word, removes
   the only explicit home-suburb statement).

## 🎯 Owner decisions needed

- [x] Ruling on Shane + Jesse attributions (keep / rename) — rec 2.
- [x] Approve the test-fixture rename — rec 1.
- [x] Keep-or-neutralise call on the live doc examples + cart.js /
      route.js comments — recs 4–5.
- [x] Confirm the history stance: publish with names in history, no rewrite.

Once ruled, the fixes are a single small Opus session; then this gate closes
and the go-public sequence continues at Theme 8 step 1 (PAT refresh) and
step 2 (branch protection) before any visibility flip.

## Rulings (owner, 2026-08-06) — and how they were applied

All four ruled in one sitting, walked through question by question:

1. **Shane + Jesse — keep, with their OK.** The attribution stays on the
   basis that both are happy with a first name on a public site; that OK
   is the owner's to hold and is not a repo artefact. Tree unchanged
   (site data and the two mirroring test fixtures keep the names).
2. **Test-fixture rename — approved and applied** (`ea4ccde`, Opus
   session). Ruth→Alex, Booth→Sam, the flagged fixture name→Jo, derived
   strings included. `tests/` now carries no family names; the leakscan
   trigger is gone.
3. **Live texture — neutralise all live docs, applied.** cart.js:6 and
   route.js:137 reworded (`5830081`, + SHELL_VERSION bump); the
   CHANGELOG share-flow examples and the ROADMAP Theme-10 example moved
   to neutral names. Closed records (ROADMAP-DONE, SESSIONS-ARCHIVE)
   keep their texture, as recommended. **One deviation from the ruling
   as stated:** rec 5 assumed the suburb word could stay in the
   route.js comment — it cannot: the suburb is on the owner's leakscan
   term list and term-list hits are non-exemptible by allow-marker
   (atelier D1, owner-ruled 2026-08-04), so the comment now keeps the
   concept ("toward the suburb, not a street") without naming the
   place. Product content (venue data, index.html fallbacks) is
   untouched. Three adjacent "drive home"-framing comments
   (route.js:1–2, geo.js:108, app.css:269) name no person or place and
   were left alone.
4. **History stance confirmed: publish with names in history, no
   rewrite.** Same stance as the rpi flip (its ADR 0009): edits above
   are go-forward texture; history keeps what it has.

**This gate is closed.** Follow-on found while applying: the suburb is
simultaneously product content and a leakscan term, and leakscan judges
changed lines — so the existing venue-data/index.html lines are
grandfathered until the next edit touches one, which will then block
with no marker hatch. Queued in Theme 8's leakscan-disposition item.
