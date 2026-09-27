# 0131 — Personal notes on a recipe merge like a rating, not like a heart

**Status**: accepted
**Date**: 2026-09-28
**Answers** roadmap
[`250/040`](../roadmap/250-theme-17-cook-mode-recipes-you-can-actually-co/040-17e-the-rest-of-what-the-research-turned-up.md)
(17e's personal-notes bullet) · **extends** [0012](0012-device-local-profiles.md)'s
per-profile scoping to a new store · **reuses** the three-way merge
[0017](0017-cross-device-sync-encrypted-blob-bearer-code.md) /
[0060](0060-sync-merges-three-ways-because-the-layer-has-no-clock.md) built
for ratings · **follows** the free-text discipline of the order-line note
(Theme 14c)

## Context

17e's bullet:

> **Personal notes on a recipe** ("used half the sugar, better") — profile-
> scoped, and it slots straight into Theme 11's personal layer and Theme 12's
> export.

Substitutions are the bullet's other half and are explicitly out: a
substitution is owner-authored content ("no buttermilk → milk + lemon"), never
generated, and nothing here touches it.

A note needed an identity, a storage shape, and — because it is asked to slot
into "Theme 12's export" — an answer to sync's three-way merge, which the
codebase already has strong opinions about (sync-merge.js's header: *"the
personal layer carries no clock… so there is nothing to do last-write-wins
with"*). The obvious naive design — store a note as `{ text, editedAt }` and
pick the newer `editedAt` on conflict — was rejected before it was written: it
would be the one field in this whole layer carrying a clock nobody else
trusts, built on a wall-clock stamp from whichever device happens to be
pushing, which is exactly the "precision the moment the two devices disagree
about the time" sync-merge.js's own `tieBreak` was written to avoid.

## Decision

**A note is keyed and merged exactly like a rating**, because it already has
the right shape for it: a rating is a flat `{key: 1..5}` map; a note is a flat
`{key: text}` map. Nothing about "three-way merge a flat map" needed reinventing
for a string instead of a number — `sync-merge.js`'s `mergeMap` merges either
one identically, and now takes an explicit `kind` parameter so a rating
conflict and a note conflict are reported distinctly (`CONFLICT_RATING` vs
`CONFLICT_NOTE`) without being two functions.

**Identity is `recipeId(venueId, item)`** — the same `venueId + " " + dishId`
join `checklist.js` and `shopping.js` already use, not a new `d:`/`v:`-prefixed
key like favourites/ratings. A note is never about a venue, only ever about a
whole recipe, so the venue/dish discriminator those two carry is a distinction
notes have no use for. Because `dishId` is a stored fact and never derived from
the name (ADR 0051), a recipe renamed on the page keeps the same key and the
same note for free — this is the "rename-safe keying" the roadmap asked for,
and it cost nothing beyond reusing the existing identity.

**Merge conflicts settle the same deterministic way ratings' do — not
chronologically.** `sync-merge.js` has no clock anywhere in this layer, on
purpose (see Context). A genuine two-sided edit of one recipe's note between
two devices since they last agreed is rare — a note usually gets written once,
on the device that just finished cooking — so trading a small chance of a
reproducible, not-necessarily-newest pick for staying inside the architecture
that already works (and is proven not to ping-pong forever, `mergeSet`/
`mergeMap`'s symmetry tests) is the right trade. The alternative bought
"newer wins" and cost re-litigating a design question this repo has already
settled once.

**Free text, bounded, rendered as characters.** `MAX_NOTE = 240` (three times
the order-line note's 80, because "used half the sugar, better — also good
with brown butter" is a sentence, not a counter instruction) is the one gate
every write, sync merge and import passes through (`normaliseNoteText` in
`site/js/notes.js`). Every renderer (`notes-ui.js`, `cook-ui.js`) writes it
through `textContent` only — the same rule Theme 14c's order note proved with
a crafted `<img onerror>` string, now proven again for this store by
`recipe_check.mjs`.

**Cook mode gets a read-only echo, not an editor.** Adding an edit path inside
cook mode's dialog would mean a second commit path into the same store; a
read-only line beside the recipe name (`.cook-note`) costs one `notes.get(rid)`
call at open and answers "readable in cook mode if cheap" without widening
scope. It is read once, not subscribed — cook mode is not the surface anyone
edits a note from, so a live repaint for the rare case of editing the note
*while* cook mode is open over the same recipe was judged not worth a second
subscription.

**The recipe list does not show which recipes carry a note.** Considered and
declined: menu.js renders the Cook at Home list from a different code path than
recipe.js, so showing this would mean a second lookup site, a badge, CSS and a
browser-check assertion on a screen the roadmap bullet did not name. "Only if
trivial" was the bar the roadmap itself set, and this was not it.

## The tables this store was walked through, and what each answered

🚩 This repo has been wrong about this whitelist **twice** — the sync code
leaked into the plaintext backup, and the geo-consent flag after it. So every
row below is **asserted** in `tests/notes.test.js`, `tests/personal-data.test.js`,
`tests/sync.test.js` or `tests/sync-merge.test.js`, not reasoned about.

| table | answer | why |
|---|---|---|
| `profiles.js` `SCOPED_BASE_KEYS` | **added** | a note is per-profile, travels with migrate/export/sync — the opposite of the shopping list (device-level) and the same as ratings |
| `profiles.js` `PURGED_BASE_KEYS` | **covered** (derived from `SCOPED_BASE_KEYS`) | deleting a profile purges its notes with everything else that travels |
| `personal-data.js` `collectPersonalData` | **covered for free** — it loops `SCOPED_BASE_KEYS` generically to build each profile's fields | adding the base key was the whole change on the collect side |
| `personal-data.js` `normaliseProfile` / `sanitiseNotes` | **added** — clips the key, runs every value through `normaliseNoteText` | the same drop-rather-than-trust gate `sanitiseRatings` uses |
| `personal-data.js` `summarisePersonalData` | **added** — a `notes` count | shown in the export confirmation and the import preview |
| `personal-data.js` `writeProfileStores` (new-profile import) | **added** | a brand-new imported person's notes are written like their favourites/ratings |
| `personal-data.js` `applyPersonalData` (merge branch) | **added — yours win**, same rule as ratings | a note is a judgement about your own cooking; a restore is not grounds to overwrite one you have since edited. A recipe with no existing note gets the incoming one |
| `sync.js` `writeSnapshot` | **added** — `put("faves.notes.v1", …)`, replace not merge | the merge has already decided; writeSnapshot's job is to make storage match it |
| `sync.js` `sameSnapshot` | **added** to the comparison shape | without this a notes-only change would look like "nothing changed" and never sync at all |
| `sync-merge.js` `mergeOne` / `mergeMap` | **added** — `mergeMap(…, CONFLICT_NOTE)`, merged snapshot carries `notes` | the same three-way logic ratings use, a distinct conflict label |
| `sync-start.js` | **added** to `stores` (schedules a push) and `onApplied` (re-points the live store after a pull) | without this, editing a note would never trigger a sync push, and a pulled note would sit on disk unread until reload |
| `share-codec.js` | **untouched** | a note is not shared; `type` still takes `order` and `shortlist` only |
| `sw.js` `SHELL` | **both modules added**, `SHELL_VERSION` → `2026-09-28.4` | `check_precache.py` and `tools/check_versions.py` enforce it |
| `renames.js` `migrateEntries` / dish-id migration | **not needed** | a note's key (`recipeId`) is already rename-safe by construction (ADR 0051) — there is no name-form key to migrate, unlike a rating's `d:<venue> <name>` |
| `reo.js` | **left English**, queued in `docs/reo-review-queue.md` | "Your note:" is built with the note's own text appended, and `reo.js` swaps whole strings only — the same limitation already recorded there for the distance-limit lines |

## Consequences

- A genuine two-sided note conflict (both devices edited one recipe's note
  since they last agreed) is resolved the same deterministic-but-not-necessarily-
  newest way a two-sided rating conflict is, and is reported as a `CONFLICT_NOTE`
  the same way — today nothing surfaces that report to the reader (mirroring
  ratings, whose conflicts are likewise resolved silently rather than asked
  about, unlike diet). If that is ever felt as a real loss, the fix is a UI on
  the existing `conflicts` array, not a new merge mechanism.
- `recipe_check.mjs` grows with a new section for the note control: typed text
  survives a real reload, is rendered as characters (a crafted `<img onerror>`
  note stays literal), and belongs to the active profile only (a second,
  differently-profiled reload shows none of it).
- Substitutions remain entirely unbuilt. Nothing in `notes.js`, `notes-ui.js`
  or this record reads, writes or suggests one.
