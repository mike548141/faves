# 0053 — A photo of a named product must be that product

**Status:** accepted
**Date:** 2026-08-16

## Context

`image`/`alt` have been in the schema and in `menu.js` since early on, and
until now **no dish or venue in the corpus had ever set them**. The owner asked
for photos on one venue "so we can test it out properly", nominated McDonald's,
and — asked directly about copyright — ruled:

> If you can get open licensed photos that look great then lets do that,
> otherwise go ahead with the mcdonalds photos.

Both routes were therefore authorised, and the judgement was ours to make.

The judgement is not really about licensing. Faves is a menu app: a photo
beside a named dish is **a claim about what you will be handed**. For a
trademarked product — Big Mac, McCrispy, Filet-O-Fish — a generic burger from a
photo library is not merely a worse picture, it is a false depiction of a named
product, which is worse than no picture at all.

## Decision

**Use the venue's own product photography for every dish, and record why.**

- All 41 McDonald's dishes use McDonald's New Zealand's own product images,
  fetched once from the same Scene7 assets its NZ menu pages serve.
- Provenance, rights and the rejected open alternatives are recorded in
  `data/images/mcdonalds.json` — the research store, never served, never
  precached (ADR 0047), because no screen renders any of it.
- Images are processed **once, at authoring time**, and the finished files are
  the shipped artefact. There is no build step and must never be one (ADR 0001).
  Each source is a transparent PNG cutout, trimmed to the product's alpha
  bounding box and re-centred on a fixed 720x540 frame at 86% fill, then encoded
  as WebP. 720x540 is 2x the 358 x 268.5 CSS box **measured in a real browser at
  390px**, and matches the `4 / 3` that `.dish-photo` already declares — so
  `object-fit: cover` neither crops nor letterboxes at runtime.
- Shipping **transparent** cutouts rather than photos on a background is what
  lets one set serve both themes: the dish photo takes `--surface-2` from the
  card, so there is no white block in dark mode and no dark block in light mode.

## Rejected

- **Openly-licensed photographs (the owner's first preference).** Searched on
  Wikimedia Commons per dish, and genuinely good public-domain studio work
  exists — Evan-Amos covers Big Mac, McChicken, Filet-O-Fish, two McMuffins,
  Quarter Pounder and the apple pie; Chris Woodrich covers fries and 10-piece
  nuggets. It lost on three specific grounds, none of them "it is not
  McDonald's": (1) every candidate is an **opaque** photograph on its own
  background, and a single opaque tile among 40 transparent cutouts reads as a
  bug, most obviously in dark mode; (2) several depict **another country's**
  product — the PD fries carton carries the Canadian maple-leaf arches, the PD
  apple pie is the US baked pie shown split open rather than the NZ sleeve;
  (3) for the NZ-only items nothing usable exists at all, and what does exist is
  CC BY / CC BY-SA — requiring visible attribution — and is not a product shot
  (the only NZ Big Arch on Commons is a whole meal tray, the only McCafé flat
  white is a Hong Kong cup beside a ciabatta). Mixing sources would have bought
  a licence improvement on ~8 of 41 dishes at the cost of the set's consistency
  and, on the fries, its accuracy.
- **Generic stock photography.** The failure mode this record exists to prevent.
  ARCHITECTURE already says "generic stock only as a captioned fallback"; for a
  trademarked product there is no caption that repairs the wrong sandwich.
- **A build step that resizes on deploy.** Rejected on ADR 0001. The machine has
  no image library at all (no PIL, no numpy, no ImageMagick, no `cwebp`), which
  made the point moot as well as principled: the work was done once, by hand,
  with `sips` and a headless-Chrome canvas, and the output committed.
- **JPEG on a flat background.** Simpler, and it was built and looked at first.
  It forces one background colour to serve both themes; on the McDonald's dark
  studio set the letterbox seam was visible, and on the NZ white set it put a
  glaring white rectangle in every dark-mode dish row.

## Consequences

- The images are **all rights reserved**. They are the venue's own photographs
  of the venue's own products on that venue's own menu listing, which is the
  basis recorded; if McDonald's ever objects the remedy is cheap and is written
  down in the ledger — delete `site/img/mcdonalds/` and the `image`/`alt` fields,
  and the dish rows render without photos.
- **No attribution obligation** was taken on, which is why CC BY candidates were
  refused where a PD or first-party option existed.
- Photos are runtime-cached (`IMG_CACHE`), never precached, so the < 300 KB
  first-visit budget is untouched — but see the two defects this work exposed,
  recorded in the session log: an image that fails to load renders as a broken
  icon plus sprawling alt text, and `IMG_LIMIT = 60` is now nearly filled by a
  single venue.
