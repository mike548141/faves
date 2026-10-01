- [~] 🔥 **Search does not find your own recipes on the live site** `[S]
      [search][recipes]` — owner-reported 2026-10-01 (session `faves-55`),
      on `2026-10-01.20`, after `310` shipped (PR #75) with browser checks
      green.

  On both the home screen and the Cook at Home page, searching for one of
  his recipes finds nothing. `310`'s checks (`focus_check`, `device_check`)
  passed on synthetic fixtures, so the gap is between those fixtures and a
  real device: suspect the check first, then the data (a real profile id,
  the recipe record's shape after the import, or the store read at query
  time). Reproduce against his real recipe shape (the moved backup's
  structure, never its content in the repo), fix, and make the check fail
  on today's code.

  📌 **Claimed 2026-10-01 (`faves-55`).**
