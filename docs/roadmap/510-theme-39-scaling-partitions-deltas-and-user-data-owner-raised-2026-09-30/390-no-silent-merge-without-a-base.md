- [x] **No silent merge without a base** `[M] [sync]` — owner-ruled
      2026-10-02 (session `faves-4f`), guard 2 of `320`.

  A device that has synced before, or a first join that already holds
  hearts, never merges without a base silently: it asks "keep what sync has"
  or "add this device's extras". Closes the third-copy and lost-base routes
  in `docs/reviews/2026-10-01-1209-old-hearts-320-routes.md` (guard A), not a
  received shortlist or an Apply restore, which are additions asked for.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  ✅ **Closed 2026-10-02 (`faves-4f`, PR #83, ADR 0152).** When a person is on
  both sides, the base does not cover them and this device holds extras, sync
  asks "keep what sync has" or "add them to all your devices". The question
  is stored once (`faves.sync.v1.ask`); until it is answered no cycle touches
  the network (background, debounce, reconnect, other tabs), and an answer in
  one tab clears it in the others. An unanswered question is the default:
  neither answer is safe to assume. It shows as the Settings row "Needs your
  answer", like the allergen question; a banner outside Settings is an open
  option, not built. Also fixed on the way: the allergen gate now needs the
  diet answer specifically. 11 tests and 6 break-probes; `sync_check` +4 in
  two real browsers.
