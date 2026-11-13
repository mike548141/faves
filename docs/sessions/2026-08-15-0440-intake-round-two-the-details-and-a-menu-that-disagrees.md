## 2026-08-15 — Intake round two: the details, and a menu that disagrees with itself (wt: intake-round-two) — Opus 5

Owner follow-ups to the morning's intake, plus a new restaurant. A parallel
session was live, so this ran in its own worktree throughout and merged with a
fetch-and-check.

**1. The three Johnsonville venues are complete.** Street numbers found online —
**103** BurgerFuel, **105** Noodle Canteen, **109** The Ramen Shop — each
geocoded to **house-number level** through `audit_coords.py`'s Nominatim client
rather than by hand. They land within **~20 m** of the photo GPS, which is the
cross-check that says both the address and the photo sort were right.

Sources recorded by strength, not flattened: BurgerFuel and The Ramen Shop from
their **own sites**, Noodle Canteen only from a **directory listing**. The Ramen
Shop's published phone matches the number read off its shopfront sign — an
independent agreement between a first-party site and a first-party photo.

**2. `menu.js` gained wording for the untrusted methods.** They can never head
the *menu* half of the confidence note (`refreshCaveat` routes those to amber),
but they reach the *details* half, where a directory listing is often all there
is for a phone number. Without it they inherited the bare "checked" fallback and
read as first-party. Now: *"Phone, address and opening hours taken from a
directory listing on 15 Aug 2026."* <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it -->

**3. The null price, per the owner's ruling.** Thai Tara's *Prawns twister* is
back on the menu with `price: null` and the reason in its description. Verified
it degrades correctly: `menu.js` renders "—" and `cart.js` already sets
`hasUnpriced`. The owner's instinct was better than the morning's call —
the dish existing with an honest gap beats the dish being absent.

**4. 🚩 The find: Thai Tara's leaflet contradicts its own counter card.** The
takeaway leaflet collected 2026-08-15 is a *different printing* from the
laminated card photographed in store the same day — the card's prices are
handwritten stickers over an older print, the leaflet's are printed. They differ
three ways: **item codes** (R2/R3/R4 permuted), **two prices** (Thai basil and
Thai chilli, $21.50 sticker vs $22.50 printed), and **the leaflet has no duck
dishes at all** while adding a laksa the card lacks.

**None of it was silently resolved**, and the reasoning is the point:
- The **laksa was added** — an addition is safe, since one menu having a dish is
  evidence it exists.
- The **duck dishes were kept**. One leaflet omitting them is *not* evidence
  they are off the menu, and `available.offBy` is a dated claim that they are.
  Absence of evidence would have been recorded as evidence of absence.
- The **prices were not turned into a series**. Two same-day readings that
  disagree are a *conflict*, not a history; writing both would fabricate a
  same-day price rise — the correction-vs-change error ADR 0023 exists to stop.

All three now sit in the roadmap for the owner, who can settle it in one glance
at the counter.

**5. Pandan Asian Cuisine added** — 90 dishes, read from the venue's **own
online-ordering storefront**, which ADR 0031 classes `official-site` (trusted,
so no caveat). Its ordering page is JavaScript-rendered and defeated plain HTTP
fetching; the browser-fetch tool got it. **Its pin is a street centroid, not
house-level**: OSM has no house number for its street address. Stored anyway,
because at ~15 km out a ~150 m error cannot change a distance sort — and
recorded here and in the roadmap so it is never mistaken for a house-level pin.
Only the Lower Hutt store is in: the Press Hall branch's ordering page serves no
menu, so there is nothing to evidence.

**6. 🐛 Fixed a defect this session created that morning.** The roadmap block
added in round one was numbered **Theme 17**, which already existed (Cook mode).
Renumbered to **19**, with a comment in the file saying to `grep '^## Theme'`
first. Same class as the ADR-number collisions in the memory notes: a shared
counter read once and assumed free.

**Verification.** `validate.py` clean (**35** files); `node --test` 533 pass;
`device_check.mjs` run against three venues to exercise all three details
wordings (`in-store`, `official-site`, `third-party`) — one harness FAIL on
Pandan is its own precondition (it wants ≥5 peanut-tagged dishes, Pandan has 4),
not a defect. `tag_allergens.py` applied 23 more tags. `check_no_deps` clean.

🎯 **Left for the owner** (roadmap Theme 19): the leaflet-vs-card conflict above;
Pandan's Press Hall branch and its street-centroid pin; ageing
`detailsVerified`; and the reo strings.

