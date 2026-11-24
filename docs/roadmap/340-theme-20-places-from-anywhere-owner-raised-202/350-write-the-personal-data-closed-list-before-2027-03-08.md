- [~] 🚩 **Write the closed list of this repo's personal-data exceptions
      (`PERSONAL-DATA.md` under `docs/`), before atelier's `pdlistscan`
      blocks on 2027-03-08** `[M][docs]` — found 2026-11-13 by an estate
      health sweep session at the pin bump to `2a6d7a4`.

  (claimed 2026-11-24-0947, session f9ee6733, worktree faves-qr-f9ee-private)

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

  💬 **Answers so far, 2026-11-24 (queue run f9ee6733's close).**
  - **Recipe attributions:** the owner, verbatim: *"I have moved the recipes
    with family attributions into my private recipes so it stays private."*
    Checked: no family name remains in `site/data/`. The five family-attributed
    recipes are still named in `data/history/dishes/cook-at-home.json` and
    `data/estimates/` (kept forever under ADR 0047, as the estimates README
    says). Whether to remove them from those current files or list them as an
    exception was put to him with an impact analysis; open.
  - **Ownership records (ADR 0046):** asked whether to keep the permission
    (the store `data/ownership.json` is empty: `{"edges": []}`), he picked
    💬 *"Keep the permission (Recommended)"*: an answer to the options, not a
    ruling in his words. The list should carry it, quoting ADR 0046's ruling
    of 2026-08-16 and this pick.

  ✅ **Built 2026-11-24 (queue run f9ee6733); the done-when is not met, so
  the item stays open.** `docs/PERSONAL-DATA.md` is written, in atelier's
  shape, with **one** entry: PD1, ADR 0046's ownership and contact
  permission, quoting the ADR's record of the 2026-08-16 ruling and the owner's
  pick *"Keep the permission (Recommended)"*, said
  plainly to be a pick from options and not his words. It names the narrowest
  files (`data/ownership.json`, `data/entities/*.json`, `data/people/*.json`,
  the record stores, and the registry check's own fixtures), says the store is
  currently unused, and a closing section says recipe family attributions are
  not a grant: five moved private and were removed (`340/400`), and the one
  still-published title is `340/410`'s question. `CLAUDE.md`'s exception-1
  sentence now says that, and points at the list.
  - ⚠️ **Not clean yet, and why.** `pdlistscan` reads the list (the no-list
    finding is gone) but still reports **12** warnings, all
    `unlisted-marker`: `leakscan:allow:nz-address` and `nz-phone` markers on
    synthetic venue fixtures in `tests/anywhere-branch.test.js`,
    `tests/search.test.js` and `tools/test_validate.py`. A marker is not a
    grant, and the list is closed, so naming those files would be a second
    entry that only the owner can grant. They are invented venue addresses and
    phones, not people. They warn until 2027-03-08 and block from then.
    🎯 Options for him: grant a "synthetic test fixtures" entry; or have the
    fixtures rewritten so the shape-detectors no longer match and the markers
    go; or ask atelier to stop counting markers on invented data (atelier's own
    list excludes its fixtures).
  - ⚠️ **Not asked here:** the hosting account name stands in this repo (clone
    commands, the visibility check). atelier lists it as its own entry on the
    owner's words of 2026-10-03; this repo's list does not, and the owner has
    not been asked.
