## 2026-08-17-0200 — the location ask, rebuilt hours after it shipped

The owner looked at [ADR 0069]'s inline pill on his phone and asked for
something materially different: an explained dialog, a privacy promise, a
"don't ask me about this again" tickbox, a follow-up banner — and then, plainly,
*"I don't like the 'pill' button to prompt for location data, remove it."*
[ADR 0083] holds the reasoning; this is what the build taught.

### 🔑 The apparent contradiction dissolved once the two permissions were separated

0069 had ruled *"nothing is sprung on load"* and *"never as a nag or a modal"* —
that morning. The instinct is to read the new ask as a reversal. It is not,
and the distinction is the whole design:

- **The browser's permission** is what 0069 protected. A denial there is sticky
  and undone only in per-site settings, which is why an unexplained prompt on
  load is the classic route to a permanent block.
- **Our dialog cannot deny anything.** It explains, and raises the real prompt
  only when someone presses Allow.

So the new ask is the **priming affordance [ADR 0068]'s own Consequences asked
for** — 0069's pill turned out to be too quiet a form of it. What was genuinely
overruled was stylistic: no-modal, and no-second-surface. And the owner bounded
the second himself with the tickbox, so the banner is a nag *the reader can end
permanently*, which is a different object from the unbounded one 0069 refused.
🔑 **Ask which of two things a rule was protecting before calling a new request
a reversal of it.**

### 🚩 A modal opening on a timer is an interruption, and the checks said so first

Opening `showModal()` 900 ms after load broke two checks that have nothing to do
with location: `to_top_check` could not focus the tucked ↑, and
`filter_row_check` reported **every** filter control as *"blocked by DIALOG"*
with focus moved to this dialog's checkbox. The temptation is to read those as
test artefacts and isolate them. They were not: `showModal()` makes the rest of
the page inert and pulls focus, so the dialog was taking the page away from
anyone already mid-tap.

The fix went into the product, not the checks — **the modal now yields to the
banner for a reader who has already scrolled, tapped or typed**. Only *then*
were the two checks isolated (seeding the consent flag before page scripts run),
because by then the remaining interference was genuinely unrelated.
🔑 **When a check fails for a reason outside its subject, ask whether it has
just reported a real defect in yours before reaching for isolation.**

### 🔑 Removing an element crashes the checks that name it — and that is the good case

`filter_row_check` drove `#geo-ask` directly and died on a null the moment the
pill went. Loud, immediate, one line to fix. A check that had gone on *passing*
against an element that no longer existed would have been far worse — the
decorative-guard fault ([ADR 0072]) this repo keeps rediscovering. The
assertion's question was still live, so it was **retargeted to the banner**
rather than deleted.

### 🔎 A dead `distancePanel`, found by building on top of it

Settings needed a Location control, and the obvious home was `distancePanel` —
well-commented, listing `far.row` and `fav.row`, reading exactly like the live
home of the distance dials. It was **declared and never referenced**, orphaned
by the 2026-08-16 two-panel consolidation. Appending an element *moves* it, so
`placesPanel` (built later) owned the rows and this one owned nothing. The
control went into the orphan and vanished; `geo_check` caught it as a missing
row. 🔑 **Dead code that still reads as live is a trap for the next person who
extends it, and the next person was this session.** Deleted with the fix.

### 🚩 The pill's removal made Settings load-bearing

With no pill and a tickbox that suppresses forever, a reader who changed their
mind had **nowhere to go** — the feature would be off with no visible way on.
Settings → Location is therefore not a convenience; without it the tickbox is a
trapdoor. It reports on / blocked-by-browser / off as three distinct states,
which is the same gap 0069 was written to close one level up.

### The concurrency record

Four faves sessions live throughout. What worked, all of it already in the
method: broadcasting the ADR number (**0083**) and the SHELL range (`.99`–`.104`)
on open caught a peer about to jump the series to `2026-08-17.1`, which would
have made *my* pushes fail rather than theirs. Two rebases, both with real
conflicts, both resolved by **keeping both sides** — a peer's `served_check` and
my `geo_check` in CLAUDE.md's verify list, and two independent CHANGELOG
entries. ⚠️ **The reserved `.99` was still wrong by the time I merged**: main had
moved to `.105`, so a reservation made at branch time bought nothing and the
resolution was `.106`. `check_versions.py --range` is what said so.

⚠️ **And the push that reported nothing wrong while landing nothing:** a
retry loop hit a conflict, left the rebase mid-flight, and the follow-up check
printed `HEAD` equal to `origin/main` — because a rebase detaches HEAD *at*
upstream. It reads exactly like success. `git status | head -1` saying
"interactive rebase in progress" is the signal; `git rev-parse HEAD` is not.

