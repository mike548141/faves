- [x] ✅ **15x — the desktop filter row** (`f619722`), asked for twice and never
  built because it looks like a media query and is not: the controls live inside
  a `<dialog>`, and **a closed dialog cannot render its children**. One
  `#filter-controls` section now moves between the sheet and an inline host — a
  DOM move, so state and listeners survive and there is never a second copy to
  keep in step. The breakpoint lives in **JS only**; a CSS media query carrying a
  second copy of the number could disagree with the move, and that failure mode
  is a row styled as an inline panel while it is actually inside a closed dialog.
  🚩 **The quirk that bit was not the predicted one.** Focus surviving the
  narrow→wide re-parent worked first time. Going wide with the sheet **open** is
  the hard case: everything outside an open modal `<dialog>` is inert, so it must
  close first — but `close()` parks focus on the very button the move then hides.
  Capture `activeElement` **before** the close, restore **after** the hiding.
