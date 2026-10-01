- [x] **Phase 4 — personal recipes, and recipe buckets in sync** `[L]
      [data][sync][recipes]` — owner-raised 2026-09-30, revised the same day
      by [ADR 0146](../../decisions/0146-the-scaling-design-revised-after-its-cold-review.md). Needs `010` and `040`.

  **Build:**
  - A `recipes` store, one record per recipe, in the published recipe shape
    with a `u:` id prefix. The recipe page renders both kinds. Local storage
    until `080` moves it.
  - A one-off import moves the recipes the owner names from Cook at Home into
    his user data. **Which recipes is his list to give.** A move map carries
    their hearts, ratings, notes and ticks to the `u:` ids. Published copies
    leave `site/data/` by the ADR 0047 route.
  - Sync (owner-ruled **"Core copy + recipe buckets"**): the core copy stays one
    all-or-nothing write. Recipes go in a fixed number of buckets stored as
    `<blobId>:r<n>`; the Worker resets the expiry of every copy under a user
    key on any write, and the core copy records each bucket's version.
  - Measure recipe sizes to set the bucket count, and whether bucket sizes
    need padding.

  No editor in this item; it comes later.

  📌 **Claimed 2026-09-30 (`faves-0b`)** for everything except the one-off
  import, which waits for the owner's list. Any Worker change is built and
  tested but not deployed until he says so.

  ✅ **Shipped 2026-09-30, all but the import (`faves-0b` worker, branch
  `510-050`).** Still `[~]`: the owner's list, and the Worker deploy.
  1. **The store.** `faves.recipes.v1` (`recipes.js`, record in
     `recipe-record.js`): one record per recipe, published shape, `u:` id.
     `STORE_SCHEMA.recipes` is 1; the writers list names it. Unknown fields
     are carried; a `javascript:` link or image is dropped.
  2. **The page.** `recipe.html?id=u:mine&dish=u:<slug>` — the URL every
     link builder already writes for venue + dish, so hearts, the shopping
     list and cook mode reach it unchanged. Read from the store, no fetch.
     Favourites groups them under "My recipes"; `recheckReferences` never
     asks the network about one.
  3. **Backups** carry a named `recipes` field: merge adds, yours win.
  4. **Sync** (ADR 0146 §2). Core copy unchanged; 8 buckets
     `<blobId>:r<n>`, padded to 4 KiB, all 8 once any recipe exists. The
     core copy records each bucket's version; the Worker reports what it
     holds (`?buckets=8`, `X-Faves-Buckets`), and a bucket is read when
     its version is not the last agreed one — which is also how one written
     without its core update is detected and merged. The base keeps a hash
     per recipe, not a copy. The Worker re-arms every copy under the key
     on any write, once a copy is 30 days past its last write.
  5. **The move map** (`recipe-move.js`): hearts, ratings, notes, ticks and
     shopping lines follow a recipe to its `u:` id, on a key map and on a
     snapshot, plus `moveStep()` for the chain. Synthetic ids only; not run.

  **Measured (the 25 Cook at Home recipes as the sample).** 27,861 bytes of
  compact JSON with `u:` ids: mean 1,114, median 971, largest 2,470. At the
  080 threshold (1,000,000 code units, about 900 recipes) 8 buckets hold
  about 128 KiB each, half the Worker's 256 KiB cap; 4 would sit at it.
  **Padding: needed, and cheap.** Unpadded, a bucket's size tells the server
  an add (+1 KB) from an edit (+5 B), and which buckets exist tells it how
  many recipes there are. Padded, the sample is 8 buckets, 40 KiB in all.

  **Worker deploy owed** (not run). Either order is safe: an old Worker
  reports no buckets, so the site keeps recipes local and changes nothing it
  has not read; a new Worker changes nothing for an old site. Live checks to
  run after it are in `worker/README.md`.

  **Where the code differed from the item.** "Resets the expiry of every
  copy on any write" is built with a 30-day threshold: KV has no touch, so
  a literal reset is up to 8 extra writes per heart against the 1,000 a day
  free. Every copy keeps at least 150 of its 180 days after any write.

  🎯 **Forks for the owner.** (1) Is the cookbook per device (built) or per
  person? Per device keeps one family recipe once; per person matches
  hearts. Reversible by a chain step. (2) How the import reaches devices:
  a step every device runs, copying a moved recipe only where it was
  hearted, rated, noted or ticked (`add: "referenced"`), or his devices
  only (`"all"`), leaving strangers' hearts unresolved once the published
  copy goes. (3) A list of your own recipes: none yet; Back goes home.

  **Four costs, before → after** (Node, the 25-recipe sample):
  - *Processing:* a sync with no recipe change hashes the cookbook twice,
    about 1.5 ms for 25 recipes (about 30 ms at 900); nothing is sealed. A
    recipe change seals one 4 KiB bucket per changed bucket.
  - *Storage:* the cookbook itself (about 28 KB for 25), plus ~40 bytes a
    recipe of hashes in the sync base (917 bytes for 25), not a second copy.
  - *Network:* no extra request on a sync that changed no recipe; one
    ~400-byte header. A recipe edit adds one 4 KiB PUT per changed bucket;
    the first sync with recipes sends 8 (40 KiB here); a joining device
    reads 8.
  - *Server:* a new client's GET costs 8 extra KV reads (reads are the
    cheap kind); every PUT reads 16 siblings, and re-writes at most one
    each per 30 days. A recipe edit costs a bucket write beside the core
    write. A heart still costs one write.

  📌 **Claim released 2026-10-01 (`faves-0b`)** with everything but the
  import shipped (PR #58). What is left waits on the owner: his list of
  recipes, the three forks above, and his go-ahead to deploy the Worker.

  ⚖️ **Owner-ruled 2026-10-01:** the Worker deploys **with the import**, not
  before. Fork (1) is ruled **per person**, now item `120`. Fork (2), how
  the import reaches devices, and his recipe list are still open.

  🎯 **New fork from `120` (2026-10-01):** when the import runs on his own
  devices (`add: "all"`) on a phone shared by several people, whose
  cookbook gets the moved recipes? Built: the active person. Alternatives:
  every profile on the phone, or the people his list names.

  ⚖️ **Owner-ruled 2026-10-01 (session `faves-55`), all three open
  questions:**
  - **Route: his devices only, by backup file.** A local tool rewrites his
    exported backup (`moveSnapshot`, `add: "all"`); he imports it with
    Replace on one device; sync carries it to the rest. The step every
    device runs was declined. It would have kept the recipe text in the
    app's public code, since a step must ship what it copies.
  - **Recipient: the active person** (as built).
  - **His list: the recipes with a person's name in the heading, plus
    one.** `booth-s-ginger-crunch`, `jesse-s-garlic-chicken-thighs`,
    `shane-s-ribs`, `famous-brade-green-chicken-curry`, and
    `chocolate-self-saucing-pudding`, which he added. `b-s-dope-as-brownie`
    stays published (he left it out).

  📌 **Claimed 2026-10-01 (`faves-55`)** for the tool, the runbook and the
  removal of the published copies. The run itself needs his backup file,
  and the Worker deploy goes with it.

  🔧 **Import tool built 2026-10-01 (`faves-55` worker, branch
  `510-050-import`); not run.** `tools/move_recipes.mjs` rewrites an exported
  backup with the plan in `tools/recipe-moves.json` (the five, to
  `u:<same slug>`), using `moveSnapshot`/`toPersonalRecipe`; it refuses to
  write inside any git tree and prints counts only. **The runbook is the
  tool's header — follow it in that order.** What decided the order:
  - **Worker first.** Measured on the fake Worker: without bucket support,
    device B gets the moved hearts, ratings and notes but not the recipes.
  - **Published copies last.** Nothing deletes a heart whose dish has gone
    (it is marked "not on your current list"); only a tap on Remove does,
    and that takes the rating too. Removing first opens that window.
  - **All devices synced and quiet first; import straight after export.**
    A rating changed on B to an old recipe between agreeing and the import
    comes back on both devices beside the moved one; anything changed on A
    between export and Replace is lost everywhere.
  - Rollback until the copies go: Replace-import the original backup.
  🐛 **Fixed with it:** a rating on any personal recipe was lost on the next
  reload — `migrateDishKeys` slugged `u:x` to `u-x` (`dish-id.js`).

  📌 **Claim released 2026-10-01 (`faves-55`).** The tool and runbook are
  merged (PR #61; runbook in `tools/move_recipes.mjs`'s header). What is
  left needs the owner at the keyboard: deploy the Worker (with `140`'s
  change now in it), export his backup, run the tool, Replace-import, check
  a second device, and only then remove the five published copies (the
  `050` worker's list of what else names them is in its hand-back, recorded
  in the 2026-10-01 `faves-55` session log).

  ⚖️ **Fork (3) answered 2026-10-01 (`faves-55`):** the owner's own recipes are
  listed on the Cook at Home page, all of them, labelled Private (`300`).

  ✅ **Step 7 done 2026-10-01 (`faves-55` worker, branch `050-remove`).** The
  owner ran steps 1–6 and confirmed the five under "My recipes" on his phone and
  desktop. The five published copies then left `site/data/restaurants/cook-at-home.json`
  by ADR 0047's route: whole, into `data/history/dishes/cook-at-home.json`
  (a new file, five rows, each carrying `available.offBy: 2026-10-01`, which the
  round-trip needs to put them back verbatim). The venue's `picks` lost "Booth's
  Ginger Crunch" and "Shane's Ribs" and were NOT replaced: nothing says which
  recipe he would pick instead, so they read "Easy Pad Thai" and "Sticky Date
  Pudding". `data/estimates/recipes.json` is unchanged — `recipe_estimates.py`
  already treats a recorded-but-unshipped recipe as a warning, and keeps it.
  Re-pointed: `tests/units.test.js` (the oven-temperature count, 15 → 13: the
  two `180°C` steps of the pudding), `tools/focus_check.mjs` (the one-recipe
  search), `tools/cook_check.mjs` (section 13, no method). The search hint
  "ginger crunch" stays: the Groundup Cafe's own Ginger Crunch still answers it.
  Step 8 (delete the two backup files) is the owner's.

  ✅ **Closed 2026-10-01 (`faves-55`).** Runbook steps 1–7 done: Worker
  deployed and checked live, his backup moved (5 recipes to "Me", 4 hearts
  and 9 shopping lines re-pointed), Replace-imported on his laptop, synced
  to his phone (both confirmed by his screenshots), and the five published
  copies removed (PR #71). Step 8, deleting the two backup files in his
  Downloads folder, is his call. Old hearts that later came back are `320`.

  🎯 **Open with the owner (put in chat 2026-10-01, unanswered):** PR #71
  dropped Booth's Ginger Crunch and Shane's Ribs from Cook at Home's
  "first time, try…" `picks`, leaving Easy Pad Thai and Sticky Date
  Pudding. Does he want two others in their place?

  ✅ **Answered 2026-10-02 (`faves-4f`):** add Lamb Shanks and Liège Waffles.
  The picks are now Easy Pad Thai, Lamb Shanks, Liège Waffles and Sticky
  Date Pudding (the removed two's slots, in order).
