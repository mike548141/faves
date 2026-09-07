- [x] 🛑 **The location-consent flag travels in the backup file and the sync
      blob, against a stated promise** `[S][js][privacy]` — found 2026-09-08 by
      the Theme 38 review (`../../reviews/2026-09-07-1216-theme-38-cold-review.md`
      §4c), **executed, not inferred**.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — the owner's
  ruling above is the brief. Delivered by a sub-agent in its own worktree
  (`faves-o1-consent-exclude`, branch `consent-exclude`), landing by PR so CI
  runs before the merge.

  **The promise.** `ARCHITECTURE.md` (the location-ask paragraph) and
  `site/js/geo-consent.js:16-22` both say `faves.geo.consent.v1` is *"a key
  deliberately outside the backup export, because the promise is about this
  device."*

  **What the code does.** `site/js/personal-data.js` keeps an EXCLUDED table
  (`:79-144`) naming the keys the catch-all sweep must not collect: the Near-me
  origin, the checklist, the timers, the two sync keys. The consent key is not in
  it. So the sweep (`:215, 238-241`) carries it in `other`, a merge import writes
  it back onto the receiving device (`:812-816`), and because `sync.js` seals
  `collectPersonalData()`, it is in the encrypted blob too.

  **Reproduced against the real module in Node**, with a seven-key fake storage:

  ```
  exported `other` keys: [ 'faves.geo.consent.v1' ]
  re-import keeps in other: [ 'faves.geo.consent.v1' ]
  ```

  🔑 **Why it matters more than its size.** The flag itself is two booleans. The
  defect is that a promise written in two places is broken by a third, and that
  the whitelist-sheds-the-field-added-after-it class (ADR 0074's own lesson: the
  sync code once leaked into the same export) has recurred in the same table.

  📋 **The fix, small and bounded:** one EXCLUDED entry with the reason, and the
  probe above becomes a unit test asserting the key is absent from an export and
  is not written by an import. Decide at the same time whether a *restored*
  device should inherit "don't ask me again" at all — the promise says no.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — worktree
  `/Users/mike/worktrees/faves-o1-consent-exclude`, branch
  `consent-exclude@551bbe7`, landed by PR.

  ❌ **Report the refutation first: the sync half of this item is wrong.** The
  blob does NOT carry the flag, and never did. `sync.js:345` seals
  `mergePersonal`'s output, not `collectPersonalData`'s, and `mergePersonal`
  (`sync-merge.js:365-377`) builds a fresh object of `format`, `v`, `profiles`
  and `order` — `other` never reaches `sealBlob`, which is the only seal site in
  the tree. Executed, not read:

  ```
  sealed blob top-level keys: [ 'format', 'v', 'profiles', 'order' ]
  sealed blob mentions the consent key: false
  ```

  The backup half is exactly as filed, and worse than filed by one step — the
  flag does not merely survive in `other`, a merge import **writes it onto the
  receiving device's storage**:

  ```
  exported `other` keys: [ 'faves.geo.consent.v1' ]
  re-import keeps in other: [ 'faves.geo.consent.v1' ]
  import wrote onto receiving device: {"suppressed":true,"declined":true}
  ```

  After the EXCLUDED entry, the same probe on the same fixtures:

  ```
  exported `other` keys: []
  re-import keeps in other: []
  import wrote onto receiving device: null
  ```

  🎯 **The decision asked for, taken as the promise says: no.** A restored or
  merged device does not inherit "don't ask me again". The flag shadows a
  browser permission that is per-origin-per-device, so it is wrong on a phone
  that did not set it in *either* direction — restoring it silences an ask that
  phone never declined, and restoring its absence resurrects a nag someone
  switched off. The entry is therefore `spare: true`: a `replace` import leaves
  this device's own answer alone, unlike the cook-mode ticks, because "make this
  device look like the file" cannot mean re-arming a prompt the person holding
  the phone turned off, and nothing here expires on its own.

  🔎 **Found while break-probing, and fixed in the same commit:** the
  neighbouring test `an older backup carrying a sync code does not pair the
  device on import` had been passing **vacuously** since it was written. It
  applied `file()` with `decisions: {}`, which `planImport` refuses outright on
  an unanswered diet question, so its "the import did not write the key"
  assertion never exercised an import at all. It surfaced only because the new
  consent test carried a positive control — a sibling store that must be written
  — which failed. Both tests now answer the questions first and assert the
  sibling landed.

  **Verification.** Break-probe: removing the EXCLUDED entry fails exactly the
  five new tests and nothing else (`tests 70 · pass 65 · fail 5`); restored,
  `tests 70 · pass 70 · fail 0`. Full sweep from the worktree —
  `node --test` **1199 passed, 0 failed**; `validate.py` *All 57 restaurant
  file(s) valid*; `check_no_deps.py` *Zero-dependency invariant holds*;
  `check_versions.py --range origin/main..HEAD` *Version lockstep holds:
  SHELL_VERSION 2026-09-07.12 → 2026-09-08.1*. Browser checks, each reporting
  `tree …/faves-o1-consent-exclude/site · shell 2026-09-08.1 ·
  consent-exclude@551bbe7`: `boot_check` **24 passed, 0 failed** (load 6.41);
  `sync_check` **16 passed, 0 failed** (load 9.37); `geo_check` **22 passed, 0
  failed** (load 8.53). No check failed on any run, so no quiet-machine re-run
  was owed.
