# 0030 — Importing your data, and transferring it to another device

**Status**: proposed — owner to ratify • **Date**: 2026-08-09

These are the design calls [Theme 12b] and [Theme 9 v1] deliberately left open
for the build session. They are recorded here because each rejects a plausible
alternative, and two of them decide what happens to safety data.

## Context

Export shipped 2026-08-08 (Theme 12a): `collectPersonalData` gathers the whole
device-local personal layer — every profile's favourites, ratings and settings,
plus the shared order tally — into one versioned JSON file. No `apply`
counterpart was written, on purpose: its semantics *were* the open questions.

Two features need that counterpart, and they want the same one:

- **Import** (12b) — read a downloaded file back in.
- **Cross-device transfer** (Theme 9 v1) — one person's picks packed into a URL
  fragment, opened on their second device. A one-shot seed, not sync; continual
  sync needs a backend and is [ADR 0017]'s Theme 9 v2.

## Decision

### 1. One applier, two doors

`parsePersonalData` → `planImport` → `applyPersonalData` in `personal-data.js`,
pure and storage-injected. A transfer's decoded parts are wrapped by
`envelopeFromTransfer` into the same envelope a file carries, so the link path
and the file path converge before any rule is applied. There is no second,
laxer path — which matters because the rules below are the safety ones.

`share-codec.js` keeps no knowledge of the personal layer: `decodeTransfer`
returns the parts, and `personal-data.js` builds the envelope.

### 2. Merge is the default; replace is a separate, named, destructive act

Merge unions hearts (through `favourites.merge()`), adds ratings the device
doesn't have, and follows the payload for non-safety preferences. It never
deletes. Replace purges every `faves.*` key and rebuilds from the payload; it
sits behind an inline confirm that names the people about to be deleted and says
the allergen flags go with them.

**Your own rating wins on a conflict.** A score you gave a dish is a judgement
you're living with; a restore is not grounds to overwrite it with an older one.

### 3. A profile match is a question unless *both* id and name agree

This is the call that changed during the build, on evidence.

The obvious rule — "same id means the same person" — is wrong here.
`profiles.js` mints the first profile on every device with the deterministic id
`default` (so two tabs migrating at once converge instead of forking). A file
exported from a *friend's* phone therefore collides with yours on id **by
construction**. Acting on that silently would merge two people, including their
allergen settings.

So:

| Incoming vs this device | Outcome |
| --- | --- |
| id **and** name both match | merge, no question |
| id matches, name differs | **ask** |
| name matches, id differs | **ask** |
| neither | new profile (fresh id if the payload's is taken) |

The question offers exactly two answers — "same person, merge into *X*" and
"different person, add separately" — and `applyPersonalData` **returns an
error** rather than applying while one is unanswered. Pure logic proposes; the
UI asks; neither guesses.

An import never changes who is active. Being silently switched to another
profile is how you end up browsing under someone else's allergen filter.

### 4. Allergen and dietary preferences never move without a deliberate choice

If a payload carries a `diet` that differs from the matched profile's, the plan
surfaces it as a blocking question showing **both sides in full** — not a count,
not a diff summary — with three answers: keep this device's, use the payload's,
or combine (flag every allergen from either). Nothing is pre-selected: a default
here is a guess about someone's allergies.

A payload with **no** `diet` at all asks nothing and changes nothing — absent
means "nothing to say", not "clear theirs".

Non-safety settings (the two distance dials, language, maps app) do follow the
payload without asking. They are recoverable in one tap and the preview says the
person's settings are included.

### 5. The order tally is restored only onto a device with no order running

It is one live order for the table, not a preference. A restore that bulked up
an order someone was mid-way through would be a surprise with a cost attached.
Replace overwrites it like everything else.

### 6. Unknown `faves.*` stores are carried, but merge never clobbers one

Export sweeps up stores added after it was written. On import, merge writes such
a key only where the device has nothing there — we can't merge a store we don't
understand, so we decline rather than overwrite. Replace writes them all. The
Near-me origin (`faves.origin.v1`) is refused on the way in as well as out.

### 7. Transfer carries the active profile only

**Measured** (real menu data, `tools/`-served build, `encodeTransfer` +
`buildTransferUrl`, QR ceiling = v20-M = 666 bytes in `qr.js`):

| Payload | URL length | QR |
| --- | --- | --- |
| 1 venue heart + 1 rating + settings | 459 chars | fits (v17) |
| 3 favourites + 2 ratings + settings | 568 chars | fits — verified end-to-end in a browser |
| 5 favourites + 5 ratings | 901 chars | too big |
| 30 favourites + 30 ratings | 3,107 chars | too big |
| 84 favourites + 84 ratings | 8,094 chars | too big |
| every venue and dish in the catalogue (926) | 79,583 chars | too big |

So: **the link is the primary path and the QR is a bonus for a light profile.**
`share-ui.js` already reports "too big for a QR code — use Copy link" rather
than showing a dead button, and above ~8,000 characters the dialog says the link
may not survive being messaged and points at the file export instead.

Active-profile-only follows from the same numbers — carrying every profile
multiplies the length by the number of people for a payload that is already the
binding constraint — and from the framing: the transfer answers "get *my* picks
onto *my* other phone", while whole-device backup is the file's job. The receive
flow is merge-only for the same reason: a link carries one person, so offering
"replace everything" would delete the people it doesn't mention.

### 8. It is called "transfer", never "sync"

One-shot, in the UI copy and in the code. Someone who believes their phones are
syncing stops taking backups, and then loses data we told them was safe.

## Rejected

- **Replace as the default, or as a mode toggle beside merge.** Import is most
  often "I lost my phone" *or* "I want both", and only one of those is
  destructive. A toggle puts them one mis-tap apart; a separate named button
  with its own confirm does not.
- **Guessing the profile match on id alone.** Rejected on the `default`-id
  evidence above — it is not a tie-breaker, it is a collision generator.
- **Guessing it on name alone, or auto-creating a duplicate.** The first merges
  two people who share a first name (common in one household); the second
  quietly gives you two "Sam"s and splits your hearts between them.
- **A "safest wins" rule for allergens** — automatically unioning the avoid
  lists. Superficially attractive: more flags can only be safer. But it silently
  changes what a person sees on a menu, it can't be reasoned about after the
  fact, and combining is already offered as one of the three answers. Adding a
  restriction without being asked is still adding it without being asked.
- **Pre-selecting "keep mine" on the allergen question.** It makes the button
  reachable one tap sooner and turns a safety decision into a default.
- **Merging the order tally into a running order.** See §5.
- **Compressing the transfer payload to fit a QR.** The obvious lever is
  dropping the denormalised venue names, but those are what make a received
  favourite render before the menu data resolves ([ADR 0020]), and a
  hand-rolled compressor is a lot of surface for a bonus path. Measured and
  reported honestly instead.
- **Reusing the `#share=` parameter with a third payload type.** `cart-ui.js`
  consumes that fragment on every screen for the group order. A transfer under
  the same parameter would have to be routed past an unrelated feature's
  handler; its own `#xfer=` cannot be misread as a shortlist to merge into
  favourites.

## Consequences

- `settings.js` now exports `sanitiseDiet`, so the safety comparison runs on the
  same canonical shape the store persists rather than a second-guessed copy.
- `applyPersonalData` reports `persisted: false` when writes don't stick (Safari
  private mode's in-memory shim, or a full quota), and the UI says the import
  will only last until the tab closes rather than claiming a save.
- The "Your data" panel is now the tallest in Settings: **778 px at 390 px**,
  against the ~790 px the sheet can show. It fits, but the next thing added
  there needs its own row rather than another block ([ADR 0025]'s pattern).
- A review can push its questions below the sheet's fold, so the disabled "Add"
  button states its reason in visible text beside it.
- Reo: only the neutral chrome is swapped. The review itself stays English —
  most of it is interpolated counts, and the rest is allergen wording that
  `reo.js`'s safety boundary keeps English until a reo review.
- Theme 9 v2 (the encrypted sync blob) inherits this applier: it needs a merge
  with exactly these collision and allergen rules, and now has one.

[Theme 12b]: ../ROADMAP.md
[Theme 9 v1]: ../ROADMAP.md
[ADR 0017]: 0017-cross-device-sync-encrypted-blob-bearer-code.md
[ADR 0020]: 0020-favourite-reference-integrity.md
[ADR 0025]: 0025-settings-index-and-panels.md
