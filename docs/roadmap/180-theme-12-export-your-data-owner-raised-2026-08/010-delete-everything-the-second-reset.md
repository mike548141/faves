- [x] **"Delete everything": the second Reset the owner ruled, never built**
      `[M][js][safety]` — filed 2026-10-18 by `faves-b4`. Found while closing
      32d: the ruling is in [roadmap 430](../430-owner-rulings-2026-08-16-end-of-the-branch-pic/README.md)
      and no item carried it, so nothing was going to build it.
  **The ruling (2026-08-16):** Reset becomes two gated controls. "Reset
  preferences" keeps today's scope (one profile's dietary needs, flagged
  allergens, distance, units, language, maps app). **"Delete everything"**
  wipes all profiles, favourites, ratings and the order tally, behind its own
  typed confirmation with different wording, so the two cannot be confused.
  Once sync exists (it does) a reset propagates to every device, *"everywhere,
  always"*, and the confirmation names the scope — *every device signed in
  with this sync code* — with no device count (same README).
  **What it must also take:** every store the personal layer now keeps — the
  activity log (ADR 0164; `activity.clear()` is tested but only empties the
  active person), saved orders (ADR 0154), notes, cook ticks, the shopping
  list. Walk every whitelist, as ADR 0164 did, because a store added later is
  the one a wipe forgets.
  **Proof wanted:** a browser check that seeds every store across two
  profiles, deletes everything, and asserts each is empty; plus `sync_check`
  coverage of the propagation, since a wipe that a second device re-uploads
  is not a wipe.

  **Done (worker `w/180-010`, 2026-10-18; ADR 0167).** *Reset to defaults* is now
  *Reset preferences* (scope unchanged, `I agree`); *Delete everything* sits
  beside it behind its own typed phrase, `delete everything`, one `typedGate`
  mechanism for both. It erases every `faves.` key but a four-key keep-list
  (sync pairing, storage stamp, the "asked to keep data" flag, the location-ask
  promise), the Near-me origin, and the profiles themselves. Sync carries it as
  an epoch marker in the snapshot: the newer deletion voids the other side, so a
  heart another device added since the last agreement does not come back and the
  four never-synced stores are emptied on honouring. `tests/erase.test.js` fails
  on any storage-key literal not classified wiped/kept and on a live store not
  re-pointed; `tests/sync-wipe.test.js` runs 13 scenarios through the real
  Worker; `device_check` section 12 and `sync_check` 5g (40 → 47) drive it in
  real browsers. Open for the owner: nothing the ruling left unsettled; two
  readings are recorded in the ADR (the profiles go too; a build from before
  this change ignores the marker).

  📌 **Closed 2026-10-18 (faves-b4), PR #128 merged** (ADR 0167,
  SHELL_VERSION 2026-10-18.6). Readings the owner should know, each easy to
  narrow: "wipes all profiles" deletes the profiles too (back to one empty
  "Me"); the sync pairing survives, because it is how the deletion reaches
  the other devices; a build older than this one ignores the deletion marker
  and keeps what it added since its last sync; Reset preferences still
  propagates only as an ordinary settings change. `chatty_check`'s
  cold-install budget was raised to 1200 KB gzip (measured plus 4) with the
  reason in the file. Small wording oddity: with one profile the confirmation
  reads "everything Faves holds for Me".

