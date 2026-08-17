# Recommended sequence

⚠️ **The sequence below is the one set on 2026-07-08, and steps 1–4 plus the
first two of step 6 have all since shipped.** It is kept because it records
*why* the order was chosen, not because it describes what to do next — read
cold it implies nothing has landed. Reviewed 2026-08-15.

| # | The 2026-07-08 plan | Where it stands |
|---|---|---|
| 1 | Coordinates + native-maps handoff (S) | ✅ shipped — Theme 2 |
| 2 | Order tally (M) — the flagship | ✅ shipped 2026-07-08 — Theme 1 |
| 3 | Design pass (M) | ✅ shipped — Theme 3 |
| 4 | Distance-sorted "what's close" (M) | ✅ shipped — Theme 2 |
| 5 | Content growth + dish photos | 🔄 ongoing, in parallel — Theme 4 |
| 6 | Extended allergens (S) → curated/local ratings (M) → nutrition where owned (L) | ✅ first two shipped (Theme 5); **nutrition not started** |
| 7 | Health app — a separate project | ⏳ not started — Theme 6, still the north star |

**Parallel, any time (Theme 7):** ✅ both delivered — the zero-dependency CI
guard and the published SBOM shipped with the Phase 7 deploy, so the live site
has carried a provenance artefact since day one.

**What actually sequences the open work now** is the theme list above, not this
table. The live roadmap is Themes 1–19; the flagship open work is Theme 14
(add-ons), Theme 15 (UI consistency) and Theme 17 (cook mode), each with its
own internal ordering stated in the theme.

**Owner calls — resolved 2026-07-08** (kept as the record of what was decided
then; two have since moved):
1. Order tally: **in** (shipped); STRATEGY non-goal clarification landed.
2. Ratings: **show the live number when online (edge-function proxy),
   link-out when offline;** ~~dish ratings curated~~ — see Theme 5.
   ⚠️ **"dish ratings curated" is SUPERSEDED (owner, 2026-08-16):** *"It was
   never supposed to be curated ratings."* The live aggregate from Google/Yelp —
   the first half of this same line — is what he asked for. Personal ratings are
   shipped and **done**, and the control is settled (*"keep the current rating
   stars"*), which cancels the attempt-3 redesign in Theme 2.
3. Feedback intake: **no email; parked** — deploy first (Theme 4c).
   ⚠️ **Reversed 2026-08-09** — Theme 4c was reactivated by the owner
   ("tell us what's wrong or missing"). This line is superseded.
4. SBOM: **CycloneDX JSON at `/.well-known/sbom.json`** — see Theme 7.
   ✅ Shipped and serving.
