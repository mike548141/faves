- [~] 🔎 **The ⋯ button may be covered once a menu is scrolled** `[S][css]`
      Found 2026-09-29 by a sub-agent of `faves-41` while taking 390 px
      screenshots for the Halal/Kosher work (PR #53). Not reproduced by hand.

## What was seen

The screenshot script clicked `#overflow-btn` after scrolling part-way down a
menu, and the harness's hit-test refused it: `FAIL UNREACHABLE ELEMENT` —
covered, with a `<span>` on top (ADR 0108's covered branch, which never
scrolls away). `device_check` never meets this because it clicks the button
from the top of the page.

## Why it matters

A covered control is the defect class this theme exists for. If a reader
mid-menu taps ⋯ and the tap lands on whatever sits over it, Settings is
unreachable from where they are.

## To do

Reproduce at 390 px: scroll a long menu (R & S Satay, Regal) to mid-page and
`elementFromPoint` the centre of `#overflow-btn`. Name the covering element,
its `position` and `z-index`. If it is real, fix it and add a mid-scroll ⋯
click to `to_top_check` or `picks_check`, break-probed.

  📌 **Claimed 2026-10-02 (`faves-4f`).**
