# Theme 12 — Export your data (owner-raised 2026-08-08)

**The ask, raw (owner):** *"save/export all data to a machine readable file.
That would include custom recipes, ratings, favourites etc. Absolutely anything
that the user provides."* Surfaced from the overflow **⋯ menu or Settings**.

**Why it earns its place before the sync themes.** Everything a person puts
into Faves lives in one browser's `localStorage` — a cleared cache, a reset
phone or a "clear site data" tap wipes it with no warning and no recovery.
Theme 9 (sync) eventually fixes that, but it needs a backend, an ADR and the
owner's go. Export needs **none of it**: it works offline, adds no dependency,
no trust surface and no schema change, and it's the honest answer to *"where
does my stuff actually live?"* — the same answer we'll want on record when the
About copy stops saying "no accounts" (Theme 9 addendum 2).

**What "everything the user provides" is today** (the personal layer, verified
against the code 2026-08-08):

| Store | Key | Scope |
| --- | --- | --- |
| Profiles (names + active) | `faves.profiles.v1` | device |
| Favourites (hearts) | `faves.p.<id>.favourites.v1` | per profile |
| Ratings (1–5) | `faves.p.<id>.ratings.v1` | per profile |
| Settings — dietary/allergen prefs, ranking dials, reo language, maps app | `faves.p.<id>.settings.v1` | per profile |
| Order tally | `faves.order.v1` | device-shared |

Plus, when their themes land: **user recipes** (11b — the big one, and 11b
already names export/import as day-one scope), the **hidden-recipe set** (11a),
and **personal tag overrides** (Theme 5). Build the collector so a new store is
one line, not a rewrite.

- ✅ **12a — Export** `[S]` — **shipped 2026-08-08** (owner GO same day).
  `site/js/personal-data.js` (pure, 20 unit tests) + a "Your data" section in
  Settings, directly under the profile switcher. Every design call below was
  built as recorded. Browser-verified end-to-end over CDP, not just unit
  tested: seeded two profiles, clicked the real button, and checked the file
  that landed on disk — both people's data present, the non-active one
  included, and the seeded Near-me coordinates absent from the bytes.
  🔎 **The exclusion had a hole the tests caught**: the catch-all sweep for
  unknown `faves.*` keys would have re-collected `faves.origin.v1` the moment
  it appeared in localStorage, silently defeating the "never export your
  location" promise. The excluded keys now seed the sweep's skip-set.
  ⏳ Owner to eyeball placement/wording at 390 px; iOS in-app browsers can
  refuse a download, which the UI reports rather than failing silently.
  ↪ **Placement superseded 2026-08-08** by the Settings redesign
  ([ADR 0025](../../decisions/0025-settings-index-and-panels.md)):
  "Your data" is now one of six index rows rather than a section under the
  profile switcher, and "Reset to defaults" moved in beside it behind an inline
  confirm. The owner's 390 px look is still owed and now covers both.
  Original spec, as built:
- ~~**12a — Export** `[S]`~~ — a "Download my data" action that serialises the whole
  personal layer to one versioned JSON file via `Blob` + `<a download>`
  (`faves-data-YYYY-MM-DD.json`). Vanilla, offline, zero-dep. Design calls
  already made, to save the build session re-deciding them:
  - **All profiles, not just the active one.** It's a backup, not a view.
  - **Versioned envelope** (`{ v: 1, exportedAt, profiles: [...], device: {...} }`),
    not a raw `localStorage` dump — the on-disk shape is a contract we have to
    keep reading, and the internal keys are not.
  - **Exclude the Near-me origin** (`faves.origin.v1`). It's ephemeral
    `sessionStorage`, it's the user's *location*, and nobody wants their
    coordinates in a file they email themselves. Note the omission in the file.
  - **Human-legible JSON** (pretty-printed, venue/dish **ids and names**). It's
    "machine readable" as asked, but a person opening it should recognise their
    own favourites. Ids alone rot silently when data changes (ADR 0020).
- ✅ **12b — Import** `[M][design]` — **shipped 2026-08-09**
  ([ADR 0030](../../decisions/0030-personal-data-import-and-transfer.md), proposed —
  owner to ratify). `parsePersonalData` → `planImport` → `applyPersonalData`
  in `personal-data.js` (pure, 30 new unit tests), and a file picker + preview
  in Settings → Your data. Every design call above was built as recorded:
  merge default reusing `favourites.merge()`, replace behind a confirm that
  names who it deletes, collisions asked rather than guessed, allergen prefs
  never moved without a deliberate choice showing both sides in full.
  🔎 **The collision rule needed widening mid-build.** "Same id = same person"
  is false here: `profiles.js` mints the first profile on every device as
  `default`, so a *friend's* export collides with yours by construction and
  would have silently merged two people's allergen settings. The rule is now
  "ask unless id **and** name both agree".
  Browser-verified end-to-end over CDP at 390 px, not just unit tested:
  exported a real file, imported it back (a no-op, and it says so), imported a
  doctored from-another-phone copy (both questions raised, Add disabled until
  answered, allergens combined on request), and replaced the device from it.
  ⏳ Owner to eyeball placement/wording at 390 px — the panel is now 778 px
  against ~790 px of sheet, so it fits but has no room left.
- ✅ **12c — Lean the sync themes on it** `[S]` — **done 2026-08-08 with 12a.**
  `collectPersonalData(storage, { exportedAt })` is the shared seam, built one
  step more general than export needed: it reads the raw device storage rather
  than the live per-profile singletons, so it sees *every* profile. ADR 0017's
  sync push encrypts its output; Theme 10's grant takes a subset of it.
  **No `apply` counterpart was written** — deliberately. Its semantics *are*
  12b's open design calls, so a speculative applier would have silently
  answered them. Original note:
- ~~**12c — Lean the sync themes on it** `[S]`~~ — the collector 12a needs
  (*gather the whole personal layer into one serialisable object; apply one
  back*) is **exactly** what ADR 0017's sync blob push/pull needs, and what
  Theme 10's share grant needs a scoped subset of. Build it once as a
  `personal-data.js` collect/apply pair rather than three near-identical
  serialisers. This is the cheap "lean the right way" move — do it in 12a even
  though 12a alone doesn't need the seam.

**Placement** — owner said "menu **or** settings"; ✅ **ruled Settings
2026-08-08** and built there, in a "Your data" section directly under the
profile switcher (the export covers every profile in that list, so it belongs
beside it). Cheap to move if it reads wrong on a real phone.

**Constraints check:** no backend, no accounts, no dependency, works offline,
no personal data enters the repo (the file is the *user's*, written to their
own device). ✅ Clear on all of them — which is why 12a is `[S]` and
unblocked, and can ship any time.

**Sequence:** ✅ 12a + 12c shipped 2026-08-08. 12b when there's enough in the
personal layer to be worth restoring — realistically alongside **11b** (user
recipes are the first data a person would genuinely mourn) or **Theme 9 v1**.
