# 0144 — The home price chip carries a "~" too

**Status:** accepted
**Date:** 2026-09-29
**Amends:** [0143](0143-the-venue-spend-line-carries-a-tilde.md) — its
"Not ruled on" section. The owner has now ruled on the home card chip.

## Decision (the owner's ruling)

The home card's price chip reads **`$$ ~$16pp`**, matching the restaurant
page's `$$ ~$16 per person`. Asked whether it should match, the owner said
*"yes make it match"* (2026-09-29).

Still no words. The tooltip reads `~$16 per person`. The chip's `aria-label`
replaces its content for a screen reader, so the label says "about $16 per
person": "~" alone is spoken as "tilde" or skipped.
