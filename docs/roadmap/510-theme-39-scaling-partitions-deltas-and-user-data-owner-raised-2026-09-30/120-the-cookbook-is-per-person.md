- [x] **The cookbook is per person, not per device** `[S] [data][recipes]`
      — owner-ruled 2026-10-01 "Per person" (session `faves-0b`), on
      `050`'s fork 1. Before the `050` import runs.
      ✅ 2026-10-01: per-profile key, backups, buckets, move map; no step.

  `050` built one `faves.recipes.v1` per device. Recipes now belong to a
  profile, like hearts: each person on a phone has their own. Carry it
  through backups, sync (buckets), the move map and the storage-writers
  test. No recipe exists on any device yet (there is no editor and the
  import has not run), so no upgrade step is needed if this lands first.
  Say so, with evidence, or write the step.

  📌 **Claimed 2026-10-01 (`faves-0b`)** — after `110`, same worktree.

  ✅ **Shipped 2026-10-01 (`faves-0b` worker, branch `510-110`).**
  1. **Storage.** `faves.p.<id>.recipes.v1`: the store reads through the
     active profile's scope and reloads on any registry change, as the
     ticks do. `RECIPES_KEY` joined `SCOPED_BASE_KEYS`, so removing a
     person, or a pull that removes one, purges their recipes too.
  2. **Backups** carry `recipes` inside each profile; merge adds what that
     person lacks (theirs win), replace writes each person's. A file from
     the one day the cookbook was per device gives its top-level `recipes`
     to the profile that was active there, never refused.
  3. **Sync.** A person's recipes never ride in the core copy (a known
     profile field now). Buckets file them by person, `cookbooks: { <profile
     id>: { <u: id>: record } }`; the merge and the base's hashes key each
     recipe as `"<u: id> <profile id>"`, so the same recipe id held by two
     people is two recipes. `STORE_SCHEMA.recipes` is now 2: a build that
     reads the old shape would take a new backup's recipes as none, and a
     new bucket's as deleted, so it pauses instead.
  4. **The move map** puts a moved copy in the cookbook of each person who
     held something about it; a shopping line counts for the active person.
  5. **The writers test** names `recipes.js` as each person's own cookbook.

  **No device holds a recipe, so no upgrade step** (checked 2026-10-01):
  - Nothing in `site/` calls `recipes.put` or `recipes.remove`, and nothing
    imports `recipe-move.js` (grep: only a comment and the precache list).
  - Sync cannot have written one: the live Worker, asked for buckets,
    sends no `X-Faves-Buckets` header and exposes only `ETag` (curl of
    `/v1/blob/<32 zeros>?buckets=8`: 404, `access-control-expose-headers:
    ETag`), so `readRecipes` reads as unsupported and never writes.
  - An import writes recipes only from a file that holds some, and every
    build that exports one had an empty cookbook to export. The store
    first reached `main` at `4b235cd` (2026-09-30 23:50 NZ). Only a
    hand-made file restored since then could have put one on a device; if
    one did, it sits at the bare key, which no screen reads now.

  🎯 **Fork the ruling does not settle:** when the import runs with
  `add: "all"` (the owner's own devices), which person gets the moved
  recipes on a device with several? Built: the active one. Options: the
  active one; every profile on the device; only profiles named in his list.

  🚩 **Break-probes, each caught:** the store back on the device-wide key;
  a pull writing every recipe to the active person; profile recipes left
  out of the known fields (they rode in the core copy); import dropping a
  person's recipes. `tests/sync-buckets.test.js`'s padding test was
  passing over empty buckets once keys changed shape; it now also asserts
  each bucket carries its recipes.

  **Four costs, before → after:**
  - *Processing:* a registry change re-reads one key (the active person's
    cookbook). A sync groups and flattens the cookbooks once each way;
    hashing the 25-recipe sample stays about 0.4 ms.
  - *Storage:* the same bytes, split across one key per person with
    recipes (about 30 bytes of key each).
  - *Network:* none at the sample: buckets are padded, and the 25 recipes
    are still 8 × 4 KiB (40,960 bytes).
  - *Server:* none. Devices still on a build before this one pause sync
    ("Update Faves") once a newer one syncs, until they update, and refuse
    a backup made by this build.
