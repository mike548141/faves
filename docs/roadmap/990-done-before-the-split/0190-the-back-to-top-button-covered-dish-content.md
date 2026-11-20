- [x] ✅ **The back-to-top button covered dish content** (`f619722`). Original
  text: *"the floating ↑ sits over the 'French fries' row and hides the
  right-hand end of its price. A fixed control over a scrolling list will always
  overlap something, so the fix is not 'move it' but give the dish list enough
  end padding, or let the control get out of the way while the list is moving.
  Hiding a price is the part that matters."*
  🔎 **The method is the finding.** A **full-document sweep in 37 px steps** at
  two widths × two text sizes, 547–859 positions per menu — because a fixed
  control's victim depends entirely on where you stop scrolling, and a single
  sample is exactly what every eyeball report of this bug had been.

  | Control × content | Width/text | Worst overlap | Reachable | Positions it owned the tap |
  |---|---|---|---|---|
  | `.to-top` × `.dish-price` | 390 / 16px | **100%** | **0 px** | 96 / 547 |
  | `.to-top` × `.heart` (home) | 1280 / 24px | **94.6%** | 2.6 px | 34 / 125 |
  | `.to-top` × anything | 1280 / 16 & 24px | none | — | 0 |

  **The roadmap offered two fixes and only one was live.** End padding was
  *already* sufficient: at the document end the button overlapped nothing in all
  eight combinations, before *and* after. All the damage was mid-scroll.
  **Implementation notes worth keeping.** Tucked with `opacity` + `transform`,
  deliberately **not** `visibility`, `pointer-events: none` or `[hidden]` — all
  three remove it from the tab order and the a11y tree. It stays focusable
  off-screen on the skip-link pattern and refuses to tuck while it holds focus.
  An **idle re-tuck was rejected on measurement**: it would also clear the page
  at rest, but takes the control away between the reader deciding to tap and
  reaching it. And the thing that was verified rather than reasoned about: a
  `position: fixed` element parked below the viewport adds **no** scrollable
  overflow (`scrollWidth 390 === innerWidth 390`), now asserted permanently.
