## 2026-08-15 — Two owner rulings, and a bug I diagnosed wrong (wt: pandan-branches) — Opus 5

**1. The menu-conflict rule, ruled and recorded.** For any two menus of the same
venue that disagree: **the dine-in card wins on contradictions** (prices, dish
numbers); **dishes are additive** — anything on either menu is in. Both halves
already matched what the previous round had recorded, so nothing in the data
changed; the value is that the *rule* now exists for the next conflict. Detail
and the reasoning behind each half → `ROADMAP-DONE.md`.

**2. Pandan is now a two-branch venue (ADR 0011).** Owner supplied the second
address and ruled the menu is the same at both. Melling keeps its phone and
hours; the Press Hall branch geocoded to house level — OSM names the
node "Press Hall Eatery", which is a strong confirmation. Its `hours` stay null:
the food hall publishes a house standard *and* says to check with each eatery,
which is not a claim about this stall, and a wrong "Open now" sends someone into
town for nothing.

**3. 🐛 The part worth reading: I diagnosed a bug that did not exist.** Reading
`app.js` and `menu.js` in isolation, I saw the card badge and the pinned contact
bar reading `r.hours` / `r.phone`, noted that a multi-location record carries
neither at the top level, and concluded both would render empty for every
multi-location venue. I wrote the "fix", wrote a `device_check` assertion for it,
and the assertion **passed against the deliberately reintroduced bug**.

That is the tell. `data.js` `normaliseVenue()` projects the primary branch up to
the top level before any consumer sees the record — *exactly* so those reads stay
simple — and says so in its own comment. I had not read the loader.

What that cost and what was kept:
- The `menu.js` change was reverted in full: it was a no-op refactor dressed as a
  fix, and its comment asserted a defect that isn't there. A comment claiming a
  bug that does not exist is worse than no comment.
- The `app.js` change was **kept**, with an honest comment. It is not a bug fix
  but it is a real narrowing: `venueHours(r, origin)` follows the **nearest**
  branch, which is what the "Open now" filter has always used and what the card's
  own distance and maps handoff already show. Before it, a venue whose branches
  keep different hours could show "Closed" on a card the filter had just matched
  as open — the filter's comment claimed the two agreed, and now they do.
- The decorative assertion was **deleted** and replaced with one that has teeth:
  *every branch of a multi-location venue is listed*. Proved by breaking the
  renderer (`shown.length = 1`) and watching it fail, then restoring.

The general lesson, and the reason this is in the log rather than quietly fixed:
**verify a fix by breaking it.** The first assertion passed both with and without
the change, which meant it was measuring nothing — the same failure class as the
decorative scanners already in the notes, arriving from the opposite direction.

**4. Also fixed a red result that meant nothing.** `device_check` demanded ≥5
allergen-tagged dishes and reported a hard FAIL on a healthy venue with four.
Relaxed to ≥1 — the real assertion downstream is "every tagged dish lights up",
which holds for any count, and the zero case already hard-errors before the
browser starts. A red that means nothing is how a check stops being read.

**Verification.** `validate.py` clean (35 files); `node --test` 533 pass;
`device_check` **22 / 19 / 21 pass, 0 fail** across Pandan, the default venue and
Thai Tara — the branch assertion exercised in both directions.

### Addendum 3 — an incident, and the rule it earned

**main was broken for roughly ten minutes, by an ordinary mistake nobody made
carelessly.** Recorded in full because the mechanism is not obvious and will
recur.

**What happened.** The cook-mode focus fix was applied here, in the shared
`main` checkout. To prove the new assertion actually bites, the one-line fix was
then **deliberately removed** and the guard re-run — it failed on exactly the
right assertion, which was the point. In that window a concurrent session
(`pandan-branches`) merged to `main` and its commit **swept the uncommitted
working tree in with it**. What landed was the comment and the assertion, but
not the line they describe: `main` now asserted a fix whose code was absent, so
`node tools/cook_check.mjs` failed on `main`. It also shipped a change to
`site/js/cook-ui.js` with **no `SHELL_VERSION` bump**, so installed phones would
have kept the old script.

**Nobody did anything unreasonable, and that is the finding.** The other session
followed the rules — it merged, resolved conflicts by hand, and read the prose.
Nothing in the doctrine told it that the tree it was committing contained
someone else's half-finished experiment. The doctrine's existing rule points the
other way and is about *not absorbing* another session's changes; this is the
mirror image, where your own deliberate breakage becomes someone else's commit.

🚩 **The rule this earns: never leave the shared `main` checkout in a knowingly
broken state, not even for a minute.** Proving a guard bites means breaking
code, and that experiment belongs in a worktree, or between a `git stash` and a
`git stash pop`, never bare in the tree every other session commits from. The
worktree discipline this repo already has was in place all session — the
experiment was the one thing done outside it, and it was the one thing that
broke.

**Repair, fixed forward not reverted** (`fd998f6`): the fix line restored,
`SHELL_VERSION` → `2026-08-15.4`, and the assertion re-proved by removing the
line once more — this time in full knowledge of what that costs. Verified after:
`cook_check` **36/36**, `device_check` 19/19, `node --test` 533/533,
`validate.py` 35 files, `gen_sbom --check` clean.

### Addendum — the last two rulings (wt: press-hall-hours)

**1. The menu-conflict ruling was already applied; the close-out said otherwise.**
The owner re-stated it because the previous reply listed it as an open item. It
was not: the data was verified this session and matches the ruling on every
count — Thai basil and Thai chilli resolve to the card's **$21.50** (the leaflet's
printed $22.50 discarded), the card's fried-rice numbering is stored, the
leaflet-only **laksa** is in, and all five duck dishes are kept with no `offBy`.
Nothing changed. The defect was in the *report*, not the record: an item that
had been closed in `ROADMAP.md` was still narrated to the owner as a decision
awaiting him. **Re-read the roadmap before writing a close-out**, rather than the
memory of what was open when the work started.

**2. Press Hall's hours — ruled: use the food hall's.** Applied as **Mon–Fri
11:00–15:00**, the house standard it publishes. Two consequences, both recorded:

- **Weekends are stored as closed**, and that is the hall's *silence* rather than
  a stated closure — it publishes weekday hours only. Closed is the safe
  direction: a false "closed" hides the branch, a false "open" sends someone into
  town for nothing.
- **`detailsVerifiedBy` dropped `official-site` → `third-party`.** These hours
  are the *building operator's* statement about its premises, not Pandan's about
  itself. The field is venue-level, so a mixed-provenance record has to read as
  weakly as its weakest input — the alternative is a note claiming "checked
  against the place's own site" over a fact the place never stated. Confirmed on
  screen: the tip now reads *"Menu and prices checked against the place's own
  site … Phone, address and opening hours taken from a directory listing."*

🚩 **The gap that exposes, raised not patched:** derivation is venue-level while
provenance has become per-branch. Reading weakest-wins is honest but discards
true information about the address and phone, which *are* first-party. A
per-branch `detailsVerified` pair would fix it; deferred, because one record is
not an evidence base for a schema change — the same restraint ADR 0037 applied
to ageing the field.

**Verification.** `validate.py` clean (35 files); `node --test` 533 pass;
`device_check` 22 pass on Pandan with the reworded tip asserted; `cook_check`
36 pass. `DATA_VERSION` → `2026-08-15.4` (data-only change; `SHELL_VERSION`
untouched at `.4`).

