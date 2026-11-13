## 2026-08-15 — Johnsonville intake, and the ⓘ that answers both ways (wt: menu-intake-freshness) — Opus 5

Three asks in one prompt: import the intake, stamp provenance from embedded
metadata *every* time, make freshness visible, and make the currency findable.

**1. The intake — 29 photos, five venues.** New: **Noodle Canteen
Johnsonville**, **The Ramen Shop**, **BurgerFuel Johnsonville**. **Wellington
Kebab Grill** stub → menu-complete (75 items). **Thai Tara Express** refreshed.

Twenty of the 29 photos arrived loose with camera-default names. They were
sorted by **reading each board**, then cross-checked against GPS — the owner
foldered them mid-session and his layout matched the content-derived mapping
**photo for photo, all 29, zero disagreements**. Worth recording as evidence
that content-first sorting works, because GPS alone could not have done it:
all four Johnsonville venues sat inside a **25 m** circle, which is the
phone's error, not real separation.

**2. Provenance now comes off the file (ADR 0038, `tools/intake_exif.py`).**
Stdlib JPEG APP1/TIFF walk — no `exiftool`. `verified` comes from EXIF
`DateTimeOriginal`, never mtime (copying a photo rewrites mtime, so mtime
claims a *fresher* check than the evidence supports — the one direction of
error that matters). GPS + camera is *evidence for* `in-store` rather than an
assertion of it. Two limits written down so they don't get forgotten: the tool
**suggests** a method and never writes one, and **GPS sorts but does not pin** —
coordinates still come from the geocoded address.

**3. Thai Tara: a refresh done the append way (ADR 0023).** The 2026 card is
dearer across the board (pad thai 14.50 → 21.50). **38 dishes** gained a dated
price series — the 2026-07-06 `paper-menu` reading keeps its own entry *and its
own method* beside the new `in-store` one — **9** gained `available.offBy`, **8**
renames carried their history via `revisions`. Hours changed to split service.

🚩 **Flagged, not guessed:** Thai Tara **A12 "Prawns twister"** — the handwritten
price sticker is unreadable even cropped at native resolution (leading digit 3
or 5; both implausible beside its $12.90 neighbours). The dish is **left out**
rather than recorded wrong. One sticker, one dish.

**4. The ⓘ now answers in both directions (ADR 0037).** It used to appear only
on bad news, so its absence was ambiguous — "we checked last week" and "no
comment" rendered identically. Now always present, tone only: ⚠ amber caution,
ⓘ blue "checked in store on 15 Aug 2026". <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it -->

The **a11y catch worth keeping**: the two tones sit **1.06:1** apart in
luminance — colour would have been the *only* signal, which this repo forbids
for personal marks and should forbid here too. Fixed by making the **glyph and
the accessible name** carry the difference. Contrast verified arithmetically,
not by eye: 6.90:1 / 7.36:1 glyph, 10.56:1 / 11.52:1 note text, light/dark.

**5. The honesty problem in the ask, and what it cost.** The owner asked the
positive tip to say the restaurant's *info* (phone, address, hours) and menu
are up to date. But `verified` dates the **menu** and nothing else (ADR 0031) —
saying otherwise would have made every existing record claim something nobody
checked. Rather than under-deliver or overclaim, details got **their own dated
reading**: `detailsVerified` + `detailsVerifiedBy`. The note mentions hours only
when that pair exists; otherwise it stays quiet about them. **Three records**
carry it today, which is the field reporting the truth, not a backlog.

`validate.py` **errors** on a details date with no method — unlike `verified`,
which only warns, because there is no pre-0037 corpus to be gentle with.

**6. Currency.** Stated in the blue note (where a price-curious reader already
is) and under **Prices** in About. Never appended to ~1,200 individual prices.

**Verification.** `validate.py` clean (34 files); `node --test` 533 pass;
`device_check.mjs` **22 pass** on a fresh venue and **18** on a stale one —
extended this session with tone assertions that compare the DOM **against the
record**, so a blue "up to date" on a stale menu fails the build. The
details-gate was proven in both directions by temporarily stripping
`detailsVerified` and re-running. `check_no_deps`, `gen_sbom --check`,
`check_visibility` all clean.

**Also**: `tag_allergens.py` applied **159 tags** (66 stated, 93 derived) and
gained one exclusion — *ginger/root beer is a soft drink, not a barley
product*, surfaced by Thai Tara's drinks list. And a latent bug fixed in the
header date: `new Date("2026-08-15")` parses as UTC midnight and rendered the
day **before** for any viewer west of Greenwich; record dates are the same day
everywhere.

🎯 **Owner calls left open** — none blocking, all recorded in ROADMAP:
1. **Street numbers** for the three new Johnsonville venues. They carry
   street-level addresses and **null coordinates**: the GPS cluster cannot
   separate neighbouring shopfronts, and the coordinate audit's own rule is
   that a wrong pin beats no pin *never*. You were there — the numbers are a
   two-minute fix, or a geocode once we have them.
2. **Thai Tara A12's price** (above).
3. **Ageing `detailsVerified`** the way `refreshCaveat` ages `verified`. Not
   done: three records is no evidence base for choosing a limit, and inventing
   one would repeat exactly what ADR 0036 had to correct.
4. **Reo**: the new confidence-note strings stay English alongside the caution
   they share a popover with. Added to the fluent-speaker review queue.

---

