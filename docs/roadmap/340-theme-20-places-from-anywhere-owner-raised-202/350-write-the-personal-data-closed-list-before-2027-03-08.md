- [ ] 🚩 **Write the closed list of this repo's personal-data exceptions
      (`PERSONAL-DATA.md` under `docs/`), before atelier's `pdlistscan`
      blocks on 2027-03-08** `[M][docs]` — found 2026-11-13 by an estate
      health sweep session at the pin bump to `2a6d7a4`.

  **What changed.** This repo now declares `"visibility": "public"` in
  `.atelier-floor.json` (it has been public since 2026-08-09; the declaration
  only states it). That brings atelier's `pdlistscan` into scope: a public
  repo must list every personal-data exception it holds in that file, with
  what the data is, why, how it was granted and the narrowest set of files it
  may stand in. *"A repo without that file holds none."* As at 2026-11-13 it
  warns, and it blocks the floor from 2027-03-08
  (`pdlistscan.PERSONAL_DATA_WARN_UNTIL`). atelier's own list, at the same
  path in its tree, is the model.

  **What goes in it.** The two exceptions `CLAUDE.md` § *Hard constraints*
  names: family attributions in Cook at Home recipe titles and notes
  (owner-approved 2026-07-06), and ownership and contact records in `data/`
  under ADR 0046's provenance rule (2026-08-16). Recipe attribution lines
  naming a publisher or author may be a third.

  🎯 **Why this needs the owner, not just a writer.** In a public repo only
  the principal grants an exception, *in his own words*. ADR 0046 may carry
  his words for the second; the first is recorded in `CLAUDE.md` only as
  "owner-approved", with no quotation. The session that takes this finds the
  words in the records (session logs, the ADR) and quotes them; where none
  exist, the exception goes to him to grant again.

  **Done when** `floor.py --plane ci` reports `pdlistscan` clean with files
  read, and each entry quotes its grant.
