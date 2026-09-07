- [ ] 🛑 **The location-consent flag travels in the backup file and the sync
      blob, against a stated promise** `[S][js][privacy]` — found 2026-09-08 by
      the Theme 38 review (`../../reviews/2026-09-07-1216-theme-38-cold-review.md`
      §4c), **executed, not inferred**.

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
