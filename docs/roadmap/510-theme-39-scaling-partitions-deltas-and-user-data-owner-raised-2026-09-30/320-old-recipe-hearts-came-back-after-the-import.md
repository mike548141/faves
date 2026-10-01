- [ ] 🔥 **Old hearts on the moved recipes came back after the import**
      `[S] [sync][data]` — seen by the owner 2026-10-01 at 21:50 NZDT
      (session `faves-55`), on his laptop's Favourites screen.

  **Evidence.** At 21:13–21:15 his phone and laptop both showed the import
  correct: 16 places, 53 dishes, and the five moved recipes hearted only
  under their `u:` ids. At 21:50 the laptop showed 15 places, 60 dishes,
  "4 not on your current list", and at least one old heart (Chocolate
  Self-Saucing Pudding on its old `cook-at-home` id) back beside its moved
  copy. Going from 16 to 15 places is expected (`290` folded "My recipes"
  into Cook at Home). Going from 53 to 60 dishes is not. Between the two,
  PR #71 (published copies removed) and PR #73 (`290`) deployed.

  **Not yet known:** which device or tab wrote the old keys back. The
  runbook named the known window (a device edited after its last sync and
  before the export), and the `050` worker measured that it resurrects an
  old heart. Other candidates: a third device, a second open tab holding
  the old list in memory, or a sync merge path the tests do not cover.
  **First step:** reproduce with the owner's answer on devices and tabs,
  then fix the cause, not the symptom. The owner may tap Remove on the four
  in the meantime; they point at ids that no longer exist.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ **Investigated, and one cause fixed, 2026-10-01 (`faves-55` worker,
  branch `510-320`, PR #76).**
  1. **Reproduced and fixed: a page left open writes its old hearts back.**
     Favourites, ratings and notes replace their whole stored value on every
     change, and a restaurant or recipe page keeps the copy it read on load.
     Nothing re-reads it when another tab, an import or a sync in another
     page changes them: `menu.js` and `recipe.js` reload hearts only on a
     registry change, and sync's `onApplied` fires only when that page's own
     cycle wrote something. Its next tap wrote the old copy back, and sync
     carried it to every device. Real Chrome, two tabs of one profile: a
     heart changed in the home tab, then one tap in a restaurant or recipe
     tab, put the old heart back and lost the new one. The home page was
     fine. Fixed in the stores (`favourites.js`, `ratings.js`, `notes.js`,
     `rawOf` in `store.js`): before a change each re-reads storage if
     someone else wrote since. Five tests fail on main's stores, including
     the owner's sequence end to end in `tests/sync.test.js`.
  2. 🚩 **That does not match all of the evidence.** It brings the old
     hearts back but REMOVES the moved ones and anything hearted since the
     page opened. 53 → 60 with the moved hearts still there is a pure
     union: 4 old and 3 others added, nothing removed.
  3. **Ruled out for two devices.** A fuzz of the owner's sequence (real
     client, real Worker over a KV stand-in, 2,050 runs) never once put an
     old and a moved heart in one list. It covered the Replace at any point,
     two engines per device running at once, taps on stale pages, and the
     second engine on five older builds from 2026-09-30 and 2026-10-01
     (before `010`, `050`, `100`, `140`/`190`/`210` and `160`). A three-way
     merge against a real last agreement cannot make that union. The item's
     candidates: today's sync changes, none; the Replace keeps the base and
     the move settles (existing test); `migrateEntries` rewrites nothing
     here; PR #71 is data only, and only made the old hearts read "not on
     your current list".
  4. **Reproduced: the union.** A third storage context that joined the
     sync code but never finished a sync, holding an older list, adds
     exactly its extra hearts on its first sync: 4 old and 3 others,
     nothing removed. Safari and a Home Screen app on one iPhone keep
     separate storage; so do a second browser or browser profile. The same
     context with a finished earlier sync comes out correct.
  5. 🚩 **Latent, in the Worker, not seen live.** `refreshFamily` re-arms
     the core copy on a bucket write by re-putting what KV read. Copies
     written by the Worker before `050` carry no `t`, so the first bucket
     writes re-put the core. If that read is stale (KV is eventually
     consistent), an older core goes back under its old version. In a KV
     model where a location does not see its own writes for 60 s, the
     import was undone on both devices. Not fixed here.

  🎯 **For the owner:** on the laptop's Favourites, is the "My recipe" copy
  of each of the four still hearted beside the old one? If yes, a third
  storage context did it (which browsers or apps have Faves with sync on?).
  If no, it was a page left open, fixed by PR #76, and the moved four need
  hearting again. Either way the four old rows point at recipes that no
  longer exist; Remove on them deletes only those rows and their ratings.

  ⚖️ **Status 2026-10-01 (`faves-55`):** PR #76 merged. It fixes one real
  route, where a page left open writes its old hearts back, but that route
  deletes the moved hearts, and the owner's screenshot shows the moved
  "My recipe" copies still hearted beside the old ones. So the evidence
  matches the worker's second reproduction: a **third storage context**
  holding an older list and no last-agreed copy (the worker's 2,050
  randomised two-device runs never produced the owner's state). Waiting on
  the owner: which browsers or apps have Faves with sync on. The Worker
  risk found on the way is `330`.

  **Owner's answer 2026-10-01:** no other browser, profile or app with sync
  on that he knows of: only his iPhone and Chrome (Work) on the laptop. So
  the third-copy explanation is unconfirmed. The leading candidate is now
  `340` (a stale KV read merged as another device's change), and this item
  stays open until that is reproduced against his sequence.

  📌 **Claim released 2026-10-01 (`faves-55`)** at the owner's word: "put
  them on a board for a fresh session". Nothing was built; ready to take.
