# 0013 — Ratings: curated household + device-local personal, never public

**Status:** accepted
**Date:** 2026-07-22
**⚑ Direction awaits owner ratification** (see Consequences).

## Context

ROADMAP Theme 5 wants "ratings / feedback". The honest constraint recorded
there: **public / crowd ratings** need a backend, moderation, and accounts —
breaking three standing non-goals (no backend, no accounts, no user-generated
content the site would have to host and police). Two shapes stay inside the
non-goals, and the ROADMAP recommends both:

- **(a) Curated household rating** — our own static 1–3 mark in the repo data,
  the same family as `picks` (which is already our curation, just binary).
- **(b) Local-only personal rating** — the viewer's own 1–3 mark, kept in
  `localStorage` beside the order tally / favourites / settings, never sent
  anywhere.

The personal layer and its per-profile seam already exist (ADR 0012): a rating
is personal data, so it must be per-profile, not device-wide.

## Decision

Build **(b) in full** and **(a) as schema + render only, with no invented data**
— the curated field ships dormant until the owner supplies real values.

**Scale — 1..3, shared by both.** Matching the curated scale keeps one honest
vocabulary (Good / Great / Best) across ours and theirs. Small is deliberate: a
1–5 or 1–10 scale invites false precision on a household's gut feel, and a
compact control is easier to make a ≥44px keyboard-operable target.

**(b) Personal — `faves.ratings.v1`, per-profile.** `ratings.js` is a DOM-free
store: a flat `{ key: 1..3 }` map keyed exactly like favourites (venue by id,
dish by `venueId + name`), clamped to `[1,3]` on every read and write (0 =
unset/clear). Registered in `profiles.js` `SCOPED_BASE_KEYS`, so it is
per-profile — migration copies it forward, deleting a profile purges it.
`ratings-ui.js` renders a group of three real `<button>` toggles (Tab-focusable,
Enter/Space-operable, `aria-pressed` = filled) plus a polite live summary and a
discoverable ✕ clear. Rendered on the venue header and every dish row.

**(a) Curated — optional `rating: 1..3` on the venue and on menu items.** The
minimal honest shape: `picks` is a bare array of dish-name strings, so it can't
carry a scalar without becoming objects (a churny, wide change). Instead a
sibling optional integer field at the two levels personal ratings already cover
(venue + dish) — symmetric with favourites and with the personal store, so one
mental model covers all three. `validate.py` enforces integer 1..3. Rendered
where picks render (an "Our rating ★★☆" pill) and on the venue header.

**Curated vs personal are kept visually distinct** (the personal-tags principle:
the user's own mark is unverified and must never read as our curation). Personal
= interactive, label-free, cool `--personal` violet. Curated = a static
`--accent` pill carrying an "Our rating" text label. The signal is colour **and**
chrome **and** interactivity — never colour alone.

## Rejected

- **Public / crowd ratings.** Backend + moderation + accounts; breaks three
  non-goals. Stays rejected. This is the load-bearing "no" of the whole item.
- **Live Google/Places rating inline.** A real online rating needs a keyed,
  billed Places API behind a Cloudflare Pages Function — the first billed
  external dependency. That is a **separate, owner-gated item** (ROADMAP Theme 5,
  sequenced after the Pages deploy) and explicitly **out of scope here**; it gets
  its own ADR when built.
- **Extending `picks` into objects to carry the rating.** Rewrites every pick in
  the data and every `picks` consumer for one optional scalar. A sibling field
  is far cheaper and just as honest.
- **A 1–5 / 1–10 scale.** False precision on a gut call, and a fiddlier control.
- **Device-wide (not per-profile) personal ratings.** A rating is personal
  opinion; on a shared phone it must follow the profile, like favourites.
- **Averaging personal marks across profiles / sharing them.** That reintroduces
  the crowd-rating shape (aggregation, identity) the whole item avoids.

## Consequences

- New per-profile store ⇒ `faves.ratings.v1` added to `SCOPED_BASE_KEYS` (drives
  migration-copy + delete-purge, ADR 0012).
- The curated feature ships **dormant**: no `rating` values exist in the data.
  The UI shows nothing for the curated mark until the owner adds real values —
  no fabricated ratings, honesty floor.
- **⚑ The direction (a)+(b), not-public still awaits the owner's ratification**,
  and the owner must supply the curated values before (a) shows anything. Until
  then this is a clean, reversible build behind an optional field + a local
  store; removing it is deleting two JS files, one field check, and one CSS block.
- Personal ratings are device-local only — the same person's marks do **not**
  sync across devices (that needs the signed-in app, Theme 6), consistent with
  favourites.
