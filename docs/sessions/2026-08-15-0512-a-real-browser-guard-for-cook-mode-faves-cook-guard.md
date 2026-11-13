## 2026-08-15 — A real-browser guard for cook mode (faves-cook-guard) — Opus 5

Closed the 🚩 on ROADMAP 17d: cook mode had no durable browser check of
its own, only a throwaway script that had already found two wake-lock
leaks and then been deleted. **Branch only, uncommitted, for owner
review** — nothing pushed.

**The decision (ADR 0039): a sibling, not a widening.** `device_check.mjs`
is the allergen **safety** re-apply, where a failure means someone could
be served a dish that hurts them; that verdict deserves its own line and
its own exit code, and a runtime short enough that nobody skips it. Cook
mode needs a different screen, a different fixture and machinery
`device_check` has no use for. So `tools/cook_check.mjs` (**35
assertions**), with the CDP harness extracted verbatim to
`tools/lib/browser.mjs` — one static server, one CDP client, one Chrome
launcher, shared. `device_check.mjs` is 19/19 before and after.

**The wake lock is instrumented, never faked.** Measured first, then
built on: headless Chrome 151 grants genuine `WakeLockSentinel`s on an
http origin, releases them when the page hides, and refuses a request
while hidden. A script installed before any page script wraps
`request`/`release` and keeps every sentinel, so "still held" is read off
the platform's own flag. The single intervention is a stall inside
`request` that widens — does not invent — the close-beats-the-request
race leak (b) lived in.

**Proven to bite**, by three deliberate breaks in `site/js/cook.js`, each
reverted after:

- forget the sentinel instead of releasing it → **5 FAILs**, first
  `closing hands the wake lock back — 1 held, 0 release() call(s) for
  1 request(s)`;
- store a sentinel arriving after `release()` (drop the `!wanted` guard)
  → exactly one FAIL, the in-flight one;
- never re-acquire on returning to the page → exactly one FAIL, the
  hide/show one.

**Three gaps declared instead of faked**, in the tool's own header: that
the screen genuinely stays on (needs a phone; iOS still unverified);
leak (a) in its original form, because this Chrome always releases on
hide *before* `visibilitychange`, so removing cook.js's extra release is
invisible here; and release on document teardown, which the page that
held the lock is no longer around to report. A green line that cannot go
red is decoration — this repo has already paid for three of those.

**🔎 A real defect found, deliberately not fixed.** Tapping **Back** to
step 1 disables the Back button while it holds focus, and Chrome drops
focus to `<body>` — outside the dialog. `cook-ui.js` listens for keydown
on the dialog, so the arrow keys, Home and End then do nothing until
something inside is focused again. ADR 0034 promises focus stays on
Back/Next; at the lower boundary it does not. Where focus should land is
a design call (0034 rejected moving focus to the step on every change),
so it is marked `#!###` in the check and put to the owner.

**Also found:** the driver's `scrollIntoView` needed `behavior: "instant"`.
The site sets `scroll-behavior: smooth`, so the rect was read before the page
had moved and every click far down a page landed in empty space — which made
the Cook at Home entry point look broken.

**Verified:** `cook_check.mjs` **35/35**, `device_check.mjs` **19/19**,
`node --test` **533/533**, `validate.py` (35 files, 11 warnings),
`test_validate.py`, `check_no_deps`, `gen_sbom --check`,
`check_visibility`. **Nothing under `site/` changed**, so no
`SHELL_VERSION` bump — the only edits there were the three breaks, all
reverted (`git diff site/` is empty).

🎯 **For the owner:** the focus defect above; and `docs/decisions/README.md`
was already missing its index entries for **0037** and **0038** before
this session — 0039's is appended, the hole is not this session's to fill.

### Addendum 2 — the close-out, and one rule proving itself the same day

**A finding queued upstream, not fixed here.** The close-of-session whole-repo
sweep reported `leakscan: 101 findings — commit blocked`, which was alarming and
wrong. Every one sat inside a *sibling session's* worktree at
`.claude/worktrees/`, gitignored but a full second checkout of this repo, where
our root-relative `.leakscanignore` globs cannot reach. This tree is clean.
Same root cause as the inflated `plainscan` count earlier: **the scanners walk
gitignored nested worktrees.** Filed as atelier Track E item **E9**
(`atelier@72cf216`) under queue-never-deliver — a finding only, no fix written
upstream. Recorded here too, because until E9 lands the sweep must be given
explicit paths and never a bare `.`.

🔎 **The ADR-index rule proved itself within the hour.** The rule written this
morning — *add the index entry in the same commit as the record* — was drafted
from the 0025 collision. Checking the tree afterwards found **0037 and 0038 were
both unindexed**, having landed earlier the same day. So the failure was not
historic; it was live and ongoing. Both indexed. A rule that catches something
the day it is written is a rule that was owed.

**Pin advanced again**, `bde4928` → `72cf216`, which is this session's own E9
filing and carries no doctrine change. Left alone, the next session's drift
check would fire on a commit we wrote ourselves — the decorative-guard failure
this repo has now hit four times. Drift at this pin is **0 commits, verified**.

**Put-away.** Both of this session's worktrees merged and removed. The third
session's `pandan-branches` worktree is live and locked — left strictly alone.
No `CHANGELOG` entry is owed: everything this session touched is docs and dev
tooling, and `site/` was never modified. Final sweep clean across `secretscan`,
`leakscan`, `linkscan`, `datescan`, `wrapscan`, `spellscan`, `licenscan`,
`pathscan` and `reviewscan`. CI green on every push.

---

