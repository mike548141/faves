## 2026-08-16 15:40 UTC — the recipe page, About's sediment, and a decline that concentrated on the need

Orchestration session on the primary checkout, three worktrees, five agents, and
five peer sessions live in the same repo the whole time. Delivered: the
recipe-page pass (37c/37d/37e/37l/37m), the About→Settings rehoming (23a/23c),
and half of 37n — its tooling, not its data sweep. Three ADRs written (0070,
0072, plus a rewrite of 0072 as evidence arrived), two new tools, one new
browser check.

### 🔑 Ask what the identity IS, and the migration question often stops existing

ROADMAP 37l carried a trap in writing: `ingredients` entries becoming
`{component, items[]}` groups would change the hashed line text, so every tick on
the four affected recipes would silently detach. The item offered two answers —
hash the component with the line, or accept the loss knowingly.

Neither was needed, because the question was never a compatibility question.
**Sticky Date Pudding lists `"60g butter"` in the pudding and `"Sauce: 60g
butter"` in the sauce.** Key on the text alone and those two lines collide on one
hash: tick the butter for the sauce, and the pudding's butter ticks itself. So
the component is part of the line's identity on the merits — ADR 0067's rule that
*"two lines with identical text share one tick"* is right, and these two lines are
not identical. Keying on `"<component>: <text>"` then happens to reproduce the
string the corpus already held, byte for byte: **0 mismatches across all 24
recipes**, checked programmatically rather than reasoned about.

The generalisable part is the order of the questions. The migration problem
dissolved *because* the correctness question was answered first. Asked the other
way round — "how do we preserve the old hashes?" — the answer would have been a
compatibility shim over a key that was still wrong.

### 🔎 A duplication claim is a measurement, not a reading

23a said About's **Prices** block duplicated the menu page's ⓘ and could be
deleted. The agent checked it against the corpus instead of accepting it: the ⓘ
names the currency **in its blue tone only**, and applying `refreshCaveat`'s own
rules, **39 of 55 venues sit in the amber tone**. For most of the corpus About
was the *sole* statement of currency. Deleting as written would have destroyed a
fact on 71% of venues.

It was resolved by closing the amber gap first and only then deleting About's
copy, so the fact is now stated in more places than before. 🎯 That leaves
**[ADR 0037] §3 needing supersession** — it decided currency is stated *twice*,
in the ⓘ and in About; the build implements *once, where it is asked*.
`ARCHITECTURE.md` is amended, the ADR is not, because an accepted record is
superseded and never edited.

### 🔑 A silent decline that concentrated on exactly the records it was protecting

The tagger's `addOnGroups` bug was diagnosed here as *6 of 55 files, caused by
add-on options inflating a positional `"tags"` count*. A peer session measured
the corpus and returned something reasoning had not reached: a **seventh** file
with no add-ons at all, breaking the count the *other* way — six of its 87 items
carry no `tags` key.

And then the part that changes what the defect is. The two tags the tool had
identified on that file and failed to write were **both on items with no `tags`
key**. An item with no tags array is simultaneously the most likely to be missing
a tag and the thing that renders the whole file unpatchable. **The decline is not
spread across the corpus; it concentrates on precisely the records the tool
exists to protect.** A fix aimed only at the first cause would have left the
seventh file broken and been reported as done.

🔑 The method lesson: a diagnosis that explains every instance you looked at is
not thereby the cause. Measurement found a case the mechanism could not have
produced, and the mechanism was only half of it.

### ADR 0072 — a guard is decorative when its verdict does not depend on the thing it guards

Ten instances had accumulated across two repos with nothing to point at but
CLAUDE.md prose and session logs, so every session rediscovered the pattern.
Three sessions hit fresh instances **on the same day, in parallel, without
knowing about each other** — which is what finally made it a record rather than a
note. Four of its ten faces were donated by peers during the session.

The face that undercuts the other nine came last and is the biggest finding of
the day: **`.github/workflows/ci.yml` runs none of the eight (now nine)
headless-browser checks.** `node --test` and the Python gates run; every guard in
this repo written *because* unit tests missed something real runs only when a
human types it. That is the whole answer to how `sync_check.mjs` stayed dead
through an entire refactor. **The cheap guards that catch the least are
automated; the expensive guards that catch the most are on the honour system.**
Roadmapped, with the honest complication that they need Chrome in the runner, are
slow, and are demonstrably flaky under parallel load.

### 🚩 What parallel work actually cost, and what actually caught it

Five faves sessions ran concurrently. Every one of the following was found by a
*peer*, not by the session that caused it:

- **`cook.js`/`cook-ui.js` were double-held** by two sessions each holding a
  correct map of its own files. Neither map was wrong. A third session noticed
  we had both answered the same broadcast. 🔑 **A file map is a claim about your
  own writes; a collision is a fact about somebody else's** — no amount of care
  about your own half can surface it. Measuring rather than assuming shrank it to
  nothing: `cook.js` needed **no** change at all, because its `ingredientTerms`
  already stripped a leading `"Label: "`.
- **The shared primary checkout was left mid-rebase** by two sessions running
  `pull --rebase` cycles in one working directory, with a third session's commits
  half-applied. `git push` printed success while pushing nothing. We have a
  careful protocol for *files* and none for the *repository state* of the shared
  checkout — and a rebase in progress produces no dirty-file signal that reads as
  "stop".
- **An absorbed version bump.** A session bumped `SHELL_VERSION` to `.88` while
  `main` independently moved to `.88`. A rebase does not conflict on that, it
  **absorbs** it — the constant then reads exactly the number its author intended
  and is unbumped relative to `origin/main`, so the service worker skips the
  shell cache with CI green. Only `check_versions.py --range origin/main..HEAD`
  caught it.
- **A forward link to an unlanded ADR, and a correct harvest, each hard-blocked
  every commit in the repo in turn** — mine stopped a peer minutes after theirs
  stopped me. Neither was a mistake: a forward reference is fine, and harvesting
  delivered items to the archive is exactly right. 🔑 **The defect appeared in
  the gap between two correct decisions taken by different sessions, and in three
  of four instances today the gate that fired was owned by neither party and
  blocked a third.** That is what makes it concurrency rather than code review.
  🚩 **And we both misdiagnosed the mechanism, identically.** Both sessions
  concluded `pathscan` had been promoted from warn-only to enforced, because a
  `✗ pathscan` line sat above a failed commit. **It had not been.** The blocker
  was `sizescan` both times, and its `BLOCKED by:` line was thirty lines further
  down the same output. One of us renumbered an ADR that never needed
  renumbering because of it. The ✗ that catches the eye is not necessarily the ✗
  that stopped you.
- **`0073` was claimed twice** and `0070`/`0071` had to be traded mid-session.

What worked was **the broadcast**: announcing holdings in public and answering
other people's announcements. Every collision above was found that way and none
by a file map.

### 🚩 Honest residue

- **`cook_check.mjs` is flaky, and the flakiness defeats the rule we rely on.**
  Two runs here aborted on `Runtime.evaluate` and `Input.dispatchKeyEvent`
  timeouts while a third passed 60/60; a peer session got 75/0, **73/2**, 75/0,
  75/0 across four runs of one unchanged commit. 🔑 CLAUDE.md's discipline is
  *"a wall of PASS followed by an error is not a pass — read the summary line"*.
  Flakiness beats that **specifically**, because the summary line is present and
  says FAILED, and the right response to a flake is indistinguishable from the
  wrong response to a real regression: run it again. It goes green. That is the
  trained behaviour. ⚠️ Neither session captured the failing assertions.
- **37n's sweep is not done.** The report exists and names 7 class/allergen
  splits over 58 rows; resolving them is a human pass against ADR 0025, and four
  owner calls are owed first (below).
- **Two live `tag_allergens.py` rule defects, deliberately unfixed** because a
  rules change touches every venue and belongs with the sweep: `\bmuffins?\b`
  cannot match "McMuffin" (no word boundary between "c" and "M"), so both
  McDonald's McMuffins are unreachable; and the "wheat bakery item" rule fires on
  `slices`, which tagged *"Black Fungus Slices"* as gluten — fail-safe, wrong
  reason, an EXCLUDE candidate.
- **About's close restores focus to `<body>`**, not its opener, because the
  overflow menu that opened it has already closed. Pre-existing; worth its own
  item.

### ✅ Owner rulings taken at the close

- **`contains-fish`, `vg-option` and `df-option` all adopted**, landing **with**
  the 37n sweep rather than beside it — the vocabulary is closed in three files
  that move together, and doing tag and sweep separately walks 55 venues twice.
- **The trace tier: app tags unchanged, and it lives in `site/data/`.** Only `P`
  becomes a `contains-*` tag; the payload gains the ability to carry `T` rather
  than discarding it. 🔑 **He overruled the premise a peer put to him**, which is
  the part worth keeping: *"In ruling 47 I said it only holds data the screen
  shows, **or may with future features**."* ADR 0047's Context says exactly that
  — but its own **Consequences** and `CLAUDE.md`'s restatement both state the
  rule *without* the future clause. **Two of the three places a builder looks are
  narrower than the decision**, which is why two sessions read it strictly on the
  same day. 🎯 Wants a superseding note; raised, not taken.
- **`crumbed → contains-egg` splits into two classes** — house-crumbed
  egg-washes, commercial frozen goods often do not.
- **The currency record**: he confirmed the shipped behaviour is intended —
  About names no currency, the venue page does. Written up as [ADR 0075],
  superseding only the *second home* of ADR 0037 §3. 🚩 **A fact-check worth
  keeping:** the agent's report cited "ADR 0037 §3" while the file is named
  `0037-confidence-reads-both-ways.md`, which reads like an unrelated record. It
  was right — verified by opening it before publishing, because superseding the
  wrong ADR is very hard to find later. **Check a citation by opening it, not by
  recognising the number.**

### 🎯 Owner calls still owed

2. **The tier a note-derived allergen tag carries.** Kept as the firing rule's
   own tier, so "sesame bun" lands STATED. The alternative — every note-derived
   tag is DERIVED, because "this note covers this dish" is itself an inference —
   is defensible and changes a published audit number.
3. **Does *"dairy free cheese available"* tag, or only report?** It implies the
   default cheese is dairy, and under ADR 0025's one-way rule tagging is
   fail-safe. Stopped short because the *dish* it attaches to is unknowable from
   the note. One line either way.
5. **Should add-on options appear in the disagreement report?** They are not
   dishes and have no `dishId`. Including them found one real gap.
