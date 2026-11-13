## 2026-08-16 02:46 UTC — two stores, a wider search, and six owner steers

**Ask.** Started as a pin check; became a working session as the owner browsed
the live site and raised items in flight. A parallel session (`faves-c4`) was
live throughout — 45 venues, i18n and chains landed under this one — so every
write-heavy change took a worktree and every commit rebased before pushing.

**The pin.** atelier `72cf216` → `0107000`. Thirty-eight commits, doctrine delta
confined to the first twenty-two. The Three Laws and the Zeroth are **removed**
from the apex; the dilemma line survives as honesty doctrine; the principal's
authority is **absolute and never decays** — what being informed conditions is
the *ruling*, challengeable on the briefing, never a licence to overrule him.
The board-store split did **not** propagate: it is scoped to repos that adopted
it, and this one keeps the monolithic roadmap.

**The drift check could never fire.** It read the atelier checkout's `HEAD`, and
that checkout was 16 commits behind its own origin — so a pin at the true tip
makes the range run backwards and report nothing. Measured: `0107000..HEAD`
returned **0 commits** on a tree whose doctrine had moved 38. Fixed here to
fetch and read `origin/main`; raised upstream as atelier board items 110 and
120 (`1408d98`), since the defect is in the canonical region every child
inlines.

**Two owner rulings, two ADRs.** ADR 0045 — the app ships only what it renders;
data no screen shows lives in `data/`, the repo-only research store. Evidence
first: `priceSeries`/`priceNext`/`asOf` had **zero consumers** outside the
module computing them. The payload cost was honestly small (648 B gzipped of
56 KB) and the ADR says so — the recommendation had been to leave it, the owner
ruled otherwise, and he is right about the mechanism: a store with no rule
about what enters it is one where every addition is defensible and the total is
not. 212 superseded prices and 14 departed dishes moved; payload 61,428 →
60,506 B gzipped. ADR 0046 — ownership and contacts (name, email, phone) may be
recorded, bounded by **provenance**: public-record or given. That widens the
*no personal data* constraint for the first time on a public repo, so it is
written down as a widening. Provenance is enforced as an **error**, because a
bound only written down is not a bound; `test_registry.py` catches 16 of 16
mutations. The store ships **empty** — inventing an ownership fact about a real
business would be a claim beyond its evidence.

**Six steers while browsing.** Delivered: the search index now matches address,
city, service and phone (however punctuated) and a dish by the diet it
satisfies, with a small synonym map — and no synonym that could assert an
allergen is *absent*, held by a test. The box advertises itself with a rotating
placeholder that stops on focus, stops with text in the field, and never starts
under reduce-motion. And About's version note moved above the numbers, at body
size, where the rest of the dialog's heading→prose→detail order already was.
Queued: Theme 22 (search-to-settings; the Favourites takeover, where two ways
back is the symptom not the cure; and one model for a person's data), Theme 23
(About is sediment — rehome each block by working back to the decision that
created it; write the voice guide). The owner's sharpest line is recorded in
22c as a scope ruling: on transfer, *"the tech is probably ok, the UX is bad"* —
so re-front the mechanisms, don't rebuild them.

**Verification.** `node --test` **612** (21 new); `validate.py` 45 files 0
errors; `test_validate` 30/30; `test_registry` 16/16; `registry`, `split_data
--check`, no-deps all clean; `device_check` 19/19; and the placeholder driven in
real headless Chrome at 390 px, 5/5. The `sw-versioning` test earned its keep —
it failed the moment `search-hints.js` existed but was missing from `SHELL`,
which offline would have broken. `SHELL_VERSION` → 2026-08-16.7, `DATA_VERSION`
→ 2026-08-16.3.

**Left undone, deliberately.** The te reo strings for the eight search hints —
untranslated reads as English, invented reads as wrong, and only one of those is
recoverable; the gap is marked in `reo.js` and carried into Theme 23b. ADRs
0042–0044 are **unindexed** in `docs/decisions/README.md` by the sessions that
wrote them, which is the exact hazard that README warns about; left alone as
another session's work rather than edited underneath it.

