- [~] **32d — export and wipe** `[S][js]` 🔗 **depends on 32a**

Add the log to Theme 12's export payload and to `personal-data.js`'s clear path,
and to whatever Reset ends up destroying. Do this **in the same change as 32a**,
not after: a personal store that the export and the wipe don't know about is the
kind of gap nobody finds until it matters.

  (claimed 2026-10-17-2131, faves-b4, wt: faves-390-010 — 32a and 32d in one change)


  ✅ **Done 2026-10-18 (worker `w/390-010`, with 32a).** Backup: a named
  per-person `activity` field (`localOnly`, sanitised on parse, merged by union on
  import, restored on replace, an older build's `other`-bag copy cleaned);
  `STORE_SCHEMA.activity` 1; counted in the confirmation lines. Wipe: in
  `PURGED_BASE_KEYS` (profile removal by hand and by sync pull) and in a replace
  import's enumerable and non-enumerable paths. Deliberately off sync: not in
  `SCOPED_BASE_KEYS`, and tests fail if `sync.js` or `sync-buckets.js` names it.
  ⚠️ **"Reset" today is `settings.reset()`, one person's preferences, and does NOT
  clear the log** — `settings-ui.js` records that widening Reset is the owner's call,
  and the ruled "Delete everything" control (roadmap 430) is not built. When it is, it
  must remove every person's log (`PURGED_BASE_KEYS` names the key;
  `activity.clear()` empties the active person's and is tested).
