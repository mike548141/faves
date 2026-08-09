# 0033 — "Your data" splits into two rows: the data blob, and refresh/reset

**Status**: accepted • **Date**: 2026-08-09

## Context

[ADR 0025] set the rule: one topic per index row, each row's subtitle honest
about what its panel holds. [ADR 0030] added import and transfer to the
existing "Your data" panel and flagged the risk in its own Consequences: *"the
tallest in Settings: 778 px at 390 px … it fits, but the next thing added
there needs its own row rather than another block."*

[Theme 15] confirmed the prediction. Measured now (390 px, real Chrome via
`tools/device_check.mjs`'s CDP harness, a fresh profile): the panel is
**1009 px tall with 15 children** — five actions (download, import, transfer,
refresh, reset) under one row whose own summary had grown to naming all five:
*"Save, restore, transfer, refresh or start over."* That sentence was the
detector. A summary that has to list every action it covers is a panel that
stopped being one topic.

## Decision

Split into two rows, but not the file/cache-shaped cut the roadmap sketched
("Your data" / "Storage & refresh"). Group by what each action actually
*touches*:

- **Your data** — export, import, transfer. All three move the **personal
  data blob** `personal-data.js` collects: every profile's favourites,
  ratings, settings and the order tally. None of the three is destructive on
  its own — export only reads, and import/transfer both route through the
  same `planImport` → `applyPersonalData` review ADR 0030 built, which is
  where their real confirm lives.
- **Refresh & reset** — refresh the app's cached menus/code, reset this
  profile's preferences. Neither touches the personal data blob at all:
  refresh clears a cache the *app* keeps for offline use; reset clears
  *preferences* (diet, distance, units, language, maps app) back to defaults.
  They don't share a data model — grouped instead because both are
  destructive-with-confirm housekeeping on locally stored state, of a kind
  distinct enough from backup/restore/transfer to want its own inline confirm
  rather than sitting one scroll below "Download my data".

Measured after the split (390 px, same harness): **Your data 607 px**,
**Refresh & reset 449 px** — both comfortably inside the ~790 px the sheet
shows, with room to add e.g. Theme 5's tag overrides or Theme 11's hidden/user
recipes to whichever panel earns them without repeating this problem.

New row summaries name only what their own panel holds: "Save a copy, bring
it back, or hand it to another device" (three actions, matches three
controls) and "Refresh the offline copy, or reset your preferences" (two and
two). Neither needs the word "and the rest" the way the merged row did.

## Rejected

- **The roadmap's literal split — "Your data" / "Storage & refresh".** Refresh
  and reset don't share "storage" as a concept: refresh clears a cache, reset
  clears preferences (which happen to live in the same `localStorage`, but so
  does everything else in the app — that's not a topic). The name also
  silently drops reset, which is exactly the "one summary, five actions"
  problem restated one level down. **"Refresh & reset"** names both actions in
  the row title itself — parallel verbs, matching the panel's two button
  labels ("Refresh now" / "Reset to defaults") — so nothing needs a summary
  sentence to be discovered.
- **Splitting by destructiveness instead — (export, cancel-only confirms) vs
  (import, transfer, refresh, reset)** — considered because the task brief
  flagged it as a live question. Rejected: import and transfer's confirms are
  answers to *substantive* questions (which profile, which allergen set to
  keep) that only make sense next to the data they're deciding about; peeling
  them away from export would strand "here's what's in your data" from "here's
  what changes if you bring more in," which is one continuous story. Grouping
  by data model, not by confirm-or-not, is what keeps each panel legible on
  its own.
- **Three rows (Your data / Import & transfer / Refresh & reset).** Export
  alone is one button; a row for it plus its own subtitle would out-scaffold
  what it holds, and import/transfer already read as "the rest of your data
  story" beside it. Two rows was the smallest split that fixed the honesty
  problem.

## Consequences

- `dataSection()` now returns only export + `importControls()` +
  `transferControls()`; a new `refreshResetSection()` in `settings-ui.js`
  holds refresh and reset, each keeping its own inline confirm exactly as
  before (nothing about the guards changed, only which panel they render in).
- `showIndex()` now calls `close()` on both sections, so an abandoned import
  review and an open refresh/reset confirm are both cleared when the sheet
  backs out to the index or closes.
- New row title "Refresh & reset" needs `settings.refreshResetTitle` in
  `reo.js`; left `// draft` (same convention as `settings.langTitle` /
  `settings.unitsTitle`) pending the reo review in Phase 7. "Your data" keeps
  its existing `data.title` key unchanged — the panel it now names is a
  closer match to "your data" than before, since refresh/reset (which touch
  no personal data) no longer sit under it.
- The bodies of the refresh and reset blocks (headings, hints, confirm text)
  are unchanged text, relocated — they were already untranslated English
  before this split (a pre-existing gap this ADR doesn't newly create or
  claim to fix).

[Theme 15]: ../ROADMAP-DONE.md
[ADR 0025]: 0025-settings-index-and-panels.md
[ADR 0030]: 0030-personal-data-import-and-transfer.md
