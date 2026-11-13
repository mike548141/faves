## 2026-08-16 08:45 UTC — the tail: an outage three green guards slept through

Appended after the close above, because the owner's feedback on the shipped
filter redesign turned into the sharpest finding of the day.

### 🔥 The deployed site had no service worker, for about an hour

`f708c78` listed `js/bar-shrink.js` in `sw.js`'s `SHELL` array. The module was
never committed — it lived uncommitted in a shared tree, belonging to a design
the owner had already superseded. `install` throws on any non-`ok` response
**by design** (so a 404 during a deploy race rejects the install rather than
caching a broken asset), so the *whole* install rejected. Measured on a pristine
`git archive` of each commit, fresh profile:

| | previous commit | deployed commit |
|---|---:|---:|
| SW registrations after 9 s | 1, active | **0** |
| Shell cache entries | 81 / 81 | **6 / 81** |
| Data cache | present | **absent** |

Offline mode, installability and every precached menu, gone.

🚩 **`node --test` 746, `boot_check` 15/15, `validate.py`, `check_no_deps.py`
and the version-lockstep check were all green throughout.** Not one of them
reads that list. This is the third instance this session of *a check whose scope
quietly excludes the failure it exists to prevent* — after the bare
`check_versions` all-clear and the seven unindexed ADRs. `check_versions.py`
now fails on a `SHELL` entry that names no file, unconditionally and **before**
the not-in-scope early return.

🔎 **The guard then broke CI itself**, and the way it escaped is worth more than
the fix: it read the synthetic `sw.js` in `test_check_versions.py`'s fake repo,
found no `SHELL` list, and called that absence a finding. Locally the harness
was run and only the **last two lines** of its output read — which are case
names, not the verdict. **Read the exit code, not the tail.** A new guard needs
its own no-false-positive case as much as its true-positive one.

### ADR 0056 — a precache must not be filled from the browser's cache

The owner reported the Filters button doing nothing. The code was fine, the
worker was fine. `sw.js` precached with a plain `fetch()`, which reads the
browser's **HTTP cache**, and Pages served `js/*` with `max-age=14400` — so
bumping `SHELL_VERSION` renamed the cache and the install **refilled it from the
previous deploy**. The `READY` sentinel then made that permanent. His phone held
the new `index.html` against a four-hour-old `app.js`: markup that knows about a
control its JavaScript has never heard of. It renders, logs nothing, does
nothing. A stale *worker* was ruled out by measurement — that yields a coherent
old shell with **no** Filters button, and he had the button.

Fixed in both halves, because they protect different visitors: `cache: "reload"`
on every precached asset, and a new `site/_headers` revalidating `js/`, `css/`,
`data/` and `sw.js`. Every check in the tree launches a **fresh profile**, which
is exactly the condition under which this cannot occur — **nothing tests an
upgrade**. That gap is real and unbuilt.

### The concurrency rule, one step sharper

"Name your paths" was the rule after two blanket-commit incidents. It is
**necessary and not sufficient**: the sibling who caused the outage *did* name
paths. `git add <path>` on a file two sessions have both edited stages their
hunks with yours as one blob. The rule that covers it:

> **`git diff <path>` before `git add <path>` on any file a live sibling might
> be in, and stage hunks rather than files when the diff contains work that
> isn't yours.**

Corollary, and the thing that actually stops the recurrence: **when a sibling's
ruling supersedes your design mid-build, discard your uncommitted work at
once.** Leaving it in a shared tree is what turns a superseded design into an
outage.

### Owner feedback on ADR 0052, and what it cost

He used the shipped filter redesign on his own phone and reported four things.
Measurement settled each: the dead button was the HTTP-cache bug above; the
"unfinished" look was five concrete defects (a 79.5 px void between two
controls, `⚙` reading as Settings beside an actual Settings button, two unlabelled
chips, a dashed `+n more` that reads as a placeholder, a near-invisible disabled
"Clear all"); the lost auto-hide was **real and unnamed in the ADR** — the old
tuck freed ~60 px that a fixed bar never can; and the Order pill was worse than
he said, covering **91.6 % of "About & privacy", leaving 3.7 px reachable**.

He then ruled the bar away entirely — *"I dont like the bar… two floating
buttons"* — an hour after ruling that the bar should stay and shrink. Two
sessions were briefly building opposite designs into one tree, which is how the
outage happened. The bar was handed to the other session cleanly and the
superseded work discarded rather than left in the tree.

🔎 **Measured and left for whoever owns the overlap sweep:** `.to-top` covers
**69.4 % of a venue's heart at 390 px mid-scroll, leaving 14.7 px reachable**,
and the `Faves` wordmark is **81.7 × 31.9 px**, under the 44 px floor. Both
pre-existing, same defect class as the heart overlap ADR 0052 was written for.

### One own-goal, recorded because the rule was being enforced on others

Ten headless Chrome processes leaked writing an ad-hoc probe — `stopChrome`
takes the child process, not the launch object. Killed, profiles removed, zero
remaining. The standing rule is that anything launching a browser uses
`tools/lib/browser.mjs`'s try/finally shape; an ad-hoc probe that *imports* the
harness still has to call it correctly.

---

