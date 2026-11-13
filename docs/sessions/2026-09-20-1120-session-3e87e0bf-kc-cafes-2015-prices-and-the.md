## 2026-09-20-1120 — session `3e87e0bf`: KC Cafe's 2015 prices, and the photograph I refused to read

Roadmap `500/050` part **(b)**, KC Cafe only, taken off the orchestrated queue.
`data/history/prices/kc-cafe.json` did not exist. It does now, and it holds
**136 superseded price entries** read off the shop's own boards on
**2015-09-29** — eleven years of price history that was sitting in
`intake/menus/KC cafe/` and had never been read into the record.

Branch `kc-price-history`, worktree `/Users/mike/worktrees/faves-kc-history`,
data commit `5b9a09b` on `origin/main@52709a9`. `DATA_VERSION` →
`2026-09-20.1`. The full account — the boards, the renumbering, the joins that
were refused — is in the item itself; what follows is what this session learnt
that the item does not carry.

### The file count was not the reading count, and the tool said so first

The claim line I inherited said *"9 photographs dated 2015-09-29 plus a PDF"*.
`intake_exif.py` contradicts both halves before a single image is opened:
three of the nine JPEGs share a `DateTimeOriginal` **to the second**, a GPS fix
and a byte-length with three of the others — re-saved duplicates differing only
in stored orientation — and `IMG_0327 (1).jpeg` is dated **2015-01-17**, eight
months earlier. Six distinct photographs, two readings, one PDF. 🔑 **The
lesson is cheap and I nearly skipped it: run the provenance tool before you
open the material, not after.** Reading the images first, I would have taken
three duplicates for three extra angles and one January board for a September
one, and both errors are invisible downstream.

### Refusing to transcribe is a deliverable

The January photograph is a real second reading — *Ma Po Tofu* moved $12.50 →
$13.00 between the two, and several right-column prices are hand-amended on the
board itself. It would have doubled the series. It is also a **wide-angle shot
of a whole wall taken at an angle**, and on a planar board photographed that
way the row direction is not the image's horizontal: a price sits above its
name at the top of a column and below it at the bottom. A trial transcription
of the one column I had a clean September control for produced **25 names
against 24 prices**, and two dishes appearing to *fall* in price. Nothing was
written.

🛑 **What made that call possible was having a control, and the control was
the September photograph of the same board.** Without it I would have had a
plausible-looking table and no way to know it was wrong — every price in it
sits in the right range, and an off-by-one shifts all 28 at once. 🔎 **A
transcription error does not look like an error; it looks like data.** The
same shape as the corpus's `to_top_check` finding: the artefact reads correct
and only an independent measurement says otherwise.

The September alignment got the same treatment rather than being trusted. The
numbered box gives 30 dishes whose codes still match today's record, and
dividing each 2026 price by its 2015 one lands **30 of 30 in a 1.76–2.05 band**
— an arithmetic property an off-by-one would have destroyed. Items 13–19 appear
on two separate photographs and agree. Only then did the wall board's
same-baseline readings get written down.

### The rule that decided 136 of about 170

**A price is recorded only where the board printed an English name on the same
baseline as that price, and that name resolves to exactly one dish that still
ships.** Stated once, applied everywhere, and it is what let the refusals be
listed rather than argued: the *Soup / Snack* column carries seventeen Chinese
lines and seventeen prices under **nine** English labels, so eight of its
prices are unrecorded; 2015's single *Hot & Spicy Lamb* faces three lamb
steamboats today; the *BBQ Delights* board prices whole ducks by the kilogram
and the record has no such section. Where a join rests on *section plus sole
candidate* rather than an exact name match, the entry's own `note` says so —
which is the schema's existing answer to a caveat and meant no new field was
invented for one.

### Two dishes are gone, and they do not belong in the departed store

2015 item **27 (*Pork Chop Noodle Soup*, $12.80)** and item **18 (*Honey BBQ
Pork on Rice*, $13.00)** have left the menu — visibly, because everything below
27 was renumbered up by one and today's record has no code 18. Two clay-pot and
stir-fried lines went the same way. 🔑 **They are NOT written to
`data/history/dishes/`, and the reason generalises.** That store holds dishes
that left the **payload**, carrying the item verbatim so it can be restored;
these were never in the payload, so a row there would assert a removal this
repo never made and would hand a future `--check` an `item` nobody transcribed.
They are recorded in the roadmap item as prose instead. *An absence in the
record and an absence in the world are different facts.*

### Found and left alone

The payload's prices are a **delivery-app** reading and the 2015 ones are
**counter** prices. The ~1.85× ratio is therefore a courier markup *and* eleven
years of inflation with nothing separating them, and no screen distinguishes
the two. ADR 0031's per-entry `method` keeps the record honest about it; making
the *screen* honest about it is a different question and was not opened here.

