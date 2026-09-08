# 0102 — A harvest reports its own coverage, and a gap is not a failure

**Status**: accepted • **Date**: 2026-09-08

## Context

ADR 0090 built two tools and no join between them. `tools/product_bursts.py`
prints the **population** — 183 photographs in 59 capture bursts.
`tools/products.py` validates the **records** — 87 of them. Nothing reconciled
one against the other, so *"how much of the intake has been read"* was a
question the repo could not answer and had never asked.

It cost something. **15 bursts carried no product record for two days with
every gate green**, and reading their images showed why: 26 of the 183
photographs are not products at all — a cookbook page, a printed takeaway menu
leaflet, and 21 frames of the owner's recipe notebook (roadmap `500/020`). ADR
0090's own *Consequences* say *"nothing unplaced"*, which is true and means
unplaced **in a burst** — not uncited by a record. This is ADR 0072's shape
exactly: a guard whose output is identical whether or not the thing it guards
is complete.

Two further facts shaped the design rather than decorating it.

**`source.burst` is sometimes a composite.** One product's front and back can
land either side of the grouper's 45-second gap, so a record may cite
`"b026+b045"`. An exact-string comparison against the burst list reports **17**
uncited bursts where the true answer is **15**, because `b026` and `b051` are
named only inside a composite. Measured both ways on the same tree, the same
day.

**And 26 photographs will never have a product record**, because they are not
products. Reported as a gap they are a gap that can never close, and a check
that can never reach zero is one somebody switches off inside a month.

## Decision

**`python3 tools/products.py --coverage`**, with three parts.

1. **The join lives in `products.py`, not in `product_bursts.py`.** The claim it
   settles is a claim about *this store* — has it read what it was given —
   which is the same question `--reshoot` already asks one level in.
   `product_bursts.py` is the population's tool and knows nothing about
   `data/products/`; teaching it to read the store would invert the dependency
   and make a burst grouper fail because a product record is malformed.
   `products.py` shells out to it exactly as it shells out to `intake_exif.py`.

2. **The burst field is PARSED, never compared.** `parse_burst()` splits on
   `+`, requires every part to match `b\d{3}`, and refuses anything whose parts
   do not re-emit the input exactly (ADR 0076's rule). An unfamiliar spelling
   is reported as a malformed field rather than half-understood.
   `--coverage --probe` prints the naive answer beside the parsed one and names
   the composites that account for the difference, so the 17-versus-15 stays
   *measurable* rather than remembered.

3. **A gap reports; a contradiction fails.** Uncited bursts and photographs no
   `source.files` names are **work**: they are printed with counts and the exit
   code stays 0. What exits 1 is the store disagreeing with the population — a
   record citing a burst or a file that does not exist, an exclusion naming a
   burst that does not exist or whose file count has moved, or an exclusion for
   a burst that also has a product record.

**`data/intake/not-products.json` is how a burst says "read, and deliberately
not a product".** It is a tracked file carrying, per burst, what the images
hold, how many there are, who read them and when. The file count is the
tripwire: if the burst grows, the record no longer matches and coverage says so.

## Rejected

- **A `notAProduct` flag on a record.** There is no record — that is the whole
  condition being described. It would have meant inventing an empty product
  record per excluded burst, which puts non-products into a store whose first
  sentence says it holds products.
- **Silence, i.e. hard-coding the 15 ids in the tool.** The exclusion would then
  be invisible to a reader of `data/`, unreviewable in a diff of the data, and
  carry no account of *what was seen*. The distinction this repo keeps paying
  for is "we looked and it is not a product" versus "nobody looked", and only a
  record with a `what` and a `readBy` can carry it (`needs` in ADR 0090 exists
  for the same reason).
- **Failing the run on any gap.** It would be red today, on work nobody has
  scheduled, and the cost of a permanently red check is that it stops being
  run — measured twice in this repo already (`sync_check` dead through a whole
  refactor; `to_top_check` enforcing the bug it was quoted as catching).
- **Comparing `source.burst` as a string.** Wrong by two, on the two bursts a
  reader is least likely to check, and indistinguishable from right.

## Consequences

Today, on 183 photographs and 87 records: **44 bursts harvested, 15 read and
deliberately not a product (26 photographs), 0 with neither.** Two photographs
sit inside a harvested burst and are named by no `source.files` —
`raw_food_photos/IMG_7562.jpeg` (b053) and `raw_food_photos/IMG_8118.jpeg`
(b059). They are reported and left alone: they belong to roadmap item `500/020`.

`--probe` reports, before the exclusions are applied, *"exact-string comparison
reports 17 uncited burst(s); parsing reports 15"* — the break-probe kept in the
tool rather than in a session log.

**`intake/**` is gitignored**, so on a fresh clone, in CI and in any worktree
there is nothing to reconcile. `--coverage` says `intake not present` and exits
0; the exclusions file's *shape* is still checked on every run, which is the
only reading it ever gets in CI. `--photos` points the tool at a checkout that
does have the material.

**What a clean run does not mean.** That a record is *about* the photograph it
cites. Coverage joins identifiers, so a record citing the wrong burst
reconciles perfectly. Only the images can settle that, and nothing here reads
an image.
