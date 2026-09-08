# 0106 — The evidence's provenance is committed; the evidence is not

**Status**: accepted
**Date**: 2026-09-09
**Builds on**: [0031](0031-verified-carries-its-derivation.md),
[0038](0038-intake-provenance-from-the-file.md),
[0047](0047-the-app-ships-only-what-it-renders.md)

## Context

ADR 0031 made `verified` carry a method. ADR 0038 said the method and the date
come **off the source file**, and gave the repo `tools/intake_exif.py` to read
them. Both were right and neither was enough: on 2026-09-07 a session
transcribed Simmer's menu from four photographs EXIF-dated **2026-08-25** and
wrote `verified: 2026-09-07`, because that was the day the session ran and
today is what a session knows.

That is not a cosmetic field. `refreshCaveat` ages `verified` (ADR 0036), so
an inflated date **delays the "needs a refresh" warning by exactly the amount
it is inflated** — thirteen days here. The guard against staleness was handed
a fresher date than the truth, and nothing anywhere could tell afterwards.

The owner's ask, 2026-09-07:

> *"When you pulled in the Simmer menus you don't appear to have used things
> like the EXIF data for when the photos were taken, where they were taken, of
> what etc. This needs to happen on every update of dishes, menus, restaurants,
> recipes, ingredients etc. Do we need a tool or guard or something to ensure
> all the relevant data is harvested, provenance recorded, historical data kept
> etc?"*

He ruled for a read-only tool, then a guard, then a schema block — and, on a
second question, to **keep the original evidence** so a disputed reading can be
re-checked against what was actually read.

## Decision

**What is committed is the evidence's provenance. The evidence is not — yet.**

`data/intake/menu-sources.json` records, per venue: the intake folder, and for
each file its name, capture date and time, device, whether it carried GPS, and
whether it is a photograph or a PDF. No coordinate. No pixel.

Three things follow, each rejecting an alternative that looked obvious.

### 1. The guard reads the record, not `intake/`

The plausible alternative is a guard that runs beside the raw material. It was
rejected because `intake/**` is gitignored: such a guard cannot run on a fresh
clone, in CI, or in any worktree — which is where almost all of this repo's
work happens. It would be the decorative-guard shape ADR 0072 names, running
only where the mistake has already been noticed.

With the provenance committed, the comparison runs everywhere and the output
says which of the two sources it used. When the material *is* at hand the tool
additionally diffs the record against the live files, so a folder that gained a
photograph reads as drift rather than as silence.

🛑 **Presence means MATERIAL, not a path.** `.gitignore` un-ignores
`intake/README.md`, `intake/menus/.gitkeep` and `intake/recipes/.gitkeep`, so
the folder exists in every checkout. An `exists()` test — the shape the
neighbouring `intake_index.py` uses, which is correct there only because its
own sub-folder is not kept — reported all 14 venues as drift on a clean
worktree. Measured before it shipped; two selftest cases pin it.

### 2. A photograph and a PDF are not judged the same way

A photograph evidences a reading **on its capture date, exactly**: the shutter
fired while somebody stood at the board. A PDF's `/CreationDate` says when the
*document* was written, and a menu written in March is still read in September
— it bounds the reading from **below** and says nothing above it.

Treating them alike fails a correct record. `spices-indian` reads
`verified: 2026-07-06` against photographs from 2023-11-28, and it is right:
the reading came off `menu 3.pdf`. A "newest photograph wins" rule would have
refused it — and the first version of `intake_exif.py --for` *did* offer
`2023-11-28` for a session to copy over the correct date, which is a tool built
to prevent a wrong date handing one over. It now refuses to choose when a
folder holds both, and prints both candidates.

So `verified` is **supported** when some photograph was captured on that exact
day, or some PDF was created on or before it; it is **refused** only when
nothing supports it *and* it is later than the newest photograph. A `verified`
*earlier* than all its evidence is reported, not failed — that is a refresh
waiting to be transcribed.

### 3. Only two of the six methods are enforced

`in-store` and `paper-menu` leave a file in `intake/`. `official-site`,
`delivery-app`, `phone` and `third-party` do not. A venue whose site was read on
2026-09-07 may still hold photographs from 2023, and bounding *that*
reading by *those* photographs would refuse a correct record. The other four
are listed by name in the output — never skipped in silence, because a method
that dodges the guard should be visible on the page that dodges it.

## Consequences

- A false-freshness defect of the measured class now fails a gate that runs in
  CI. Break-probed: `simmer` nudged to 2026-08-26 fails naming it with a
  one-day gap and exit 1; restored, exit 0.
- A sweep of every venue holding intake material (14) found **no second
  instance**. Simmer was corrected on 2026-09-07 and is the only case the
  corpus had. A symptom count is not an enumeration, and here the enumeration
  says one.
- The record is a new thing to keep current. `--rebuild` regenerates it and the
  guard reports drift, so it fails loudly rather than rotting.
- **The images themselves are still not in the repo, and the owner asked for
  them.** Two costs must be settled first, both stated in his own item: the
  four Simmer photographs are 32 MB and git history is permanent, so a
  per-evidence-type size rule is a decision (full resolution for the
  handwritten cabinet tags, downscaled for print); and **64 of the 68 files
  recorded here carry GPS**, in a public repo, so a strip-or-refuse rule must
  exist before the first image lands. Importing first and deciding after is the
  one order that cannot be undone. Roadmap `340/250` stays open on exactly
  this.
- **Text intake carries no provenance at all.** The 24 Apple Notes recipe
  exports are Markdown; nothing is embedded and nothing can be. `cook-at-home`
  carries `verified: null`, which is the honest state, and no tool can improve
  on it.
- Option 3 of the owner's ruling — a provenance block **in the schema** — is
  not taken here. It is a data-model change and Theme 38 is convened for that
  class; this ADR deliberately keeps everything in `data/`, where ADR 0047 puts
  what no screen renders.
