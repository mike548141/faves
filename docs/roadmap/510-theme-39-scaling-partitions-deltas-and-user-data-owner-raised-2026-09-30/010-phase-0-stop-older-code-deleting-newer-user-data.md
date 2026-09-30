- [ ] 🔥 **Phase 0 — stop older code deleting newer user data** `[S]
      [sync][data]` — owner-raised 2026-09-30 (session `faves-ad`),
      [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md).
      Needs no further ruling. It must land before **any** user schema change.

  Three fixes, each found by reading the code on 2026-09-30:

  1. **Sync must refuse a copy written by newer code.** `mergePersonal`
     outputs only the fields it knows, stamped `v: mine?.v ?? theirs?.v`
     (`site/js/sync-merge.js:423`). A device on old code would therefore drop
     any store it does not know (personal recipes, for example) and push the
     loss to every device. Fix: if `theirs.v > FORMAT_VERSION`, write nothing,
     change nothing locally, and show "Update Faves to keep syncing". Test with
     a blob one version ahead that carries an unknown store, and assert that
     the store survives on the server.
  2. **A backup in an older format must upgrade, not be refused.**
     `site/js/personal-data.js:539` refuses `raw.v < FORMAT_VERSION`. Replace
     the refusal with the upgrade chain; until there is a v2, the chain is the
     identity. Keep a v1 fixture file forever.
  3. **Ask for persistent storage.** Call `navigator.storage.persist()`, once,
     after the first write of personal data. Say in About whether the browser
     granted it.
