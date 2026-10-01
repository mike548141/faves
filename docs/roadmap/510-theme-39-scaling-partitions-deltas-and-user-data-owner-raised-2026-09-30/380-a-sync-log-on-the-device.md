- [x] **A sync log on the device, readable in Settings** `[S] [sync]` —
      owner-ruled 2026-10-02 (session `faves-4f`), guard 1 of `320`.

  The last 20 syncs, each with the page and build that ran it, whether it had
  a base, and the hearts it added and removed, kept on the device and shown in
  Settings. So the next "my hearts changed by themselves" can be read rather
  than reconstructed by asking the owner what he did. Design in
  `docs/reviews/2026-10-01-1209-old-hearts-320-routes.md` (guard C). Device
  only: never synced, never sent anywhere.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  ✅ **Closed 2026-10-02 (`faves-4f`, PR #83, ADR 0152).** The last 20 syncs
  that changed, asked or failed (no-op pulls are not kept, so they still write
  only their timestamp), in `faves.sync.log.v1`, device only: excluded from
  backups and kept by a Replace. Each entry: when, page, build, trigger, base
  (yes, none or partial), hearts added and removed here and via sync (counts,
  up to 12 ids), outcome. Settings → Your data → Sync → "Show sync history",
  with Copy. 9 unit tests and 5 break-probes; `sync_check` +3.
