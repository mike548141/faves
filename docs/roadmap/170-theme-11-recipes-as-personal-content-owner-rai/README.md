# Theme 11 — Recipes as personal content (owner-raised 2026-07-29) — owner-gated

Today Cook at Home is **24 curated recipes shipped in the repo to
everyone** (`site/data/restaurants/cook-at-home.json`, `kind: "recipes"`). The
owner's steer: keep the feature and keep *publishing* some recipes, but stop
publishing *all* of them — recipes should also be able to live in the
**private personal layer** and be shared the way favourites, ratings,
dietary needs and allergens will be (Themes 9/10), rather than being
public-or-nothing. **Needs its own ADR when built.**

**The inversion to understand first.** This is Faves' **first user-authored
content**. Everything in the personal layer today is *small state pointing
at repo data* — a heart, a rating, a dial, a language. A recipe is the
payload itself: free text, ingredient and step lists, kilobytes not bytes.
That single change lands on storage, the sync blob, the share grant, *and*
the editing UI at once — which is why 11a below is deliberately severable
from the rest.

- **11a — Hide a published recipe, per recipe** `[S]` — the "not in a
  painful way" half. A profile-scoped hidden-set (same shape as favourites);
  the curated collection still ships and still precaches, the user just
  suppresses the ones they don't want. **No backend, no schema change, no
  dependency on Themes 9/10** — this can ship on its own at any time and is
  the cheapest real answer to "stop showing me everyone's recipes".
- **11b — Create/read/update/delete your own recipes** `[L][schema][design]`
  — the substantial one. Local-first, profile-scoped, **never enters the
  repo**. Design calls to make: mobile editor UX (ingredients and steps are
  *list* editors, not one textarea — 44 px targets throughout); whether user
  recipes merge into the Cook at Home collection or form their own "My
  recipes" record; a storage ceiling and what happens at it; and
  **export/import from day one** so a user's own cooking is never trapped in
  one browser — that half is now **Theme 12**, which can ship ahead of this and
  should be built so recipes slot into its collector rather than getting their
  own exporter.
- **11c — Share recipes: all / a set / individual** `[M][constraint]` —
  extends Theme 10's grant model from **per-scope** ("favourites",
  "allergens") to **per-item** selection. That's a real step up, not a
  parameter change: the grant has to carry *which* recipes, and stay
  revocable and re-scopeable after the fact. Otherwise it inherits Theme
  10 wholesale — opt-in, read-only, forward-only revocation.
- **11d — A family shared set** `[L][constraint]` ✅ **RULED 2026-08-16: build
  it, once sync exists.** Queued behind **Theme 9 v2's backend** rather than
  decided now or dropped. It shares that dependency with **Theme 10** (a shared
  list is live, not a snapshot), so 9 v2 gates both. ⚑ discharged as a
  *sequencing* answer; the conflict and permission model below is still unbuilt
  design, not a blocker. — the hardest item here
  and the one to scope last. Theme 10's model is a **one-way, read-only**
  grant; a family cookbook everyone can *add to* is **multi-writer**, which
  brings concurrent edits, conflict resolution, and "who may remove whose
  recipe" — none of which the E2E blob design answers today. Do not assume
  Theme 10 covers it.
- **11e — Which of today's 24 recipes stay public?** ✅ **RULED 2026-08-16 —
  family-attributed recipes go PRIVATE by default.** Any recipe whose title
  carries a person's name moves out of `site/data/`; the rest stay public. The
  owner may override per recipe. 🚩 **Name the affected set before building
  anything** — on a first read that is at least *Booth's Ginger Crunch*,
  *B's Dope-As Brownie*, *Shane's Ribs*, *Jesse's Garlic Chicken Thighs* and
  *Famous Brade Green Chicken Curry*, which includes several of the collection's
  best. This ruling also settles the pending family-texture question from Theme
  8's review: first names in titles leave the public site with the recipes.
  ~~⚑ **Owner call.**~~ The
  steer was "publish some, move some private". 🚩 This intersects the
  **pending family-texture rulings** (Theme 8): the review's open question on
  the `Shane's Ribs` / `Jesse's ...` attributions (first names of people
  *outside* the immediate family, which the 2026-07-06 exception doesn't
  cover) currently has two answers on the table — keep, or rename. Moving
  those recipes into the private layer is a **third** answer, and a better
  one if this theme is being built anyway. Don't rule 11e and the
  family-texture item independently.

**Dependencies and constraints:**

- **11a needs nothing.** 11b needs nothing off-device either (local-first).
  **11c/11d require Theme 9's E2E store** and Theme 10's consent model —
  they cannot precede them.
- **The no-personal-data constraint gets *stronger*, not weaker.** User
  recipes live only in the user's own store, so the owner-approved
  family-attribution exception stops being load-bearing for anything new —
  it only ever has to cover what's deliberately published.
- **Sync-blob sizing needs revisiting** (ADR 0017). The debounced
  single-blob write model was sized for *preference state*; recipe bodies
  are orders of magnitude larger. Check the write/size envelope before
  assuming Theme 9's design carries this unchanged.
- **Offline is non-negotiable as ever** — authored recipes are local-first
  so they're fine by construction, but recipes *shared in* from someone else
  must be cached, not fetched on demand at the stove.
- **Publishing stays a separate act.** A recipe a user authors is theirs;
  nothing here creates a path from a user's device into the repo or the
  public site.
