## 2026-08-16-2259 — a parser that has to prove it read the line, and a flake that impersonates a regression

Opus orchestrator, worktree `faves-cook2` (branch `cook-recipes-17`), five
sessions live. Assigned block: cook mode and recipes — Themes 17, 18, 36, 37.
Two read-only research agents; everything written by hand in the worktree.

**Delivered: 17a's scaling half, and 37k's blocking decision.**

### 🔑 The roadmap's recommendation was overridden, and the reason generalises

17a asked for ½ / 1× / 2× over free-text ingredient lines. The roadmap
recommended **structured data** (`{ qty, unit, item, note }`) on the grounds
that render-time parsing *"will be wrong often enough to be worse than
useless"*. That is a real risk and it was answered with a third option, not a
disagreement:

> **Both options share one defect. Neither is a check.** Structured data is
> trusted because a human typed it; a parse is trusted because a regex matched.
> Neither can *tell you* it got a line wrong.

So a line is scaled **only if re-writing the parsed quantity at 1× reproduces
the author's characters byte for byte** (ADR 0076). The parser is not trusted,
it is tested — on every line, on every render, by a check that cannot pass
unless it genuinely understood what it read. Measured **204/204 byte-identical**
at 1×. This is ADR 0029's oven-temperature discipline with the proof moved from
a one-off tool run into the function, where it also covers lines written later.

### 🔎 Every refusal was found by RUNNING, never by reading

Four guards exist in `quantity.js` and each one printed a wrong number first.
None was predicted by reading the corpus:

- `"6–8 garlic cloves, crushed"` doubled to **`"12–8"`** — a range running
  backwards. Three corpus lines carry a range; all three corrupted.
- `"2 shallots, chopped (or 1 medium red onion)"` doubled the shallots and left
  the bracket offering one onion — **the amount right and the advice wrong**,
  which is the harder bug because nothing looks off.
- Half of `"½ cup (125 ml)"` is 62.5 ml. A line that scaled its cups and kept
  its millilitres contradicts itself, and **of two numbers the reader believes
  the precise-looking one** — so the bracket blocks the whole line.
- Two bugs were found by this session's own new tests within a minute of writing
  them: `"6 egg yolks"` halved to **`"3 eggs yolks"`** (a compound count noun
  pluralising on its first word), and a test asserting `1 + 2/3` against `5/3` —
  **different floats**, the exact bug the module's rationals exist to prevent,
  reproduced by accident in the test that checks for it.

### 🚩 The design crux was not the parsing

A line with **no** quantity ("Pinch of salt", 42 of 204) is safe to leave alone
silently. A line that **has** a quantity and is refused makes a **half-scaled
recipe** — flour doubled, chocolate not, nothing on screen saying so. That is
worse than not scaling at all, **because it looks finished**. Hence three
statuses rather than two, with `blocked` marked in words (not colour alone) and
counted in a note. 2× blocks 4 lines, ½× blocks 16; 20 of 24 recipes double
clean, 14 halve. **Halving is where the difficulty lives** — doubling a fraction
usually lands on one a kitchen owns, halving usually does not.

The tick key needed no thought, because the house rule already covered it:
`checklist.js` says *"HASH THE DATA, NEVER THE RENDER"* for the metric/imperial
flip, and a scale change is the same class of event. 🔑 **The architecture
already had the seam** — `tickRow(rid, kind, raw, display)` separates key from
text — so the load-bearing feature cost nothing. `recipe_check` asserts a tick
survives 1× → 2× anyway, because that failure would be **silent**: no throw, no
log, just an empty box and a reader who has lost their place in a bowl they
cannot un-pour.

### 🛑 A transport flake that impersonates a regression (measured)

Running the browser checks on a five-session laptop:

| check | runs | result |
|---|---|---|
| `boot_check.mjs` | 4 | 2 pass · **2 FAIL, exit 1** |
| `recipe_check.mjs` | 8 | 4 OK · **4 abort, exit 2** |

Both failures land on `tools/lib/browser.mjs:128` — the 30 s CDP timeout.

- 🔑 **The flakiness is the SHARED HARNESS, not `cook_check`.** The roadmap
  scopes it to one tool, and the owner's ruling picked `boot_check` for CI
  *because it "makes no timing assumptions"*. That reasoning is about assertion
  content and does not survive contact: **the timeout is in the transport**, so
  a check with no timing assumptions in its body inherits it anyway.
- 🔑 **`boot_check`'s failure is worse than an abort**, and it is a fresh
  ADR 0072 instance. It prints `FAIL <assertion name>` and exits 1 —
  byte-indistinguishable from a real regression. `recipe_check` at least dies
  saying "harness error". A guard whose red means the same thing whether or not
  the guarded thing is broken is decorative in a new way.
- `faves-hygiene` then measured the same check **7/7 green on a GitHub runner**
  (8–12 s, Chrome preinstalled). So the numbers above are evidence about **this
  machine**, not about CI — and both are worth having. The fix adopted into
  `browser.mjs`: **classify a CDP transport timeout as a harness error (exit 2),
  never as `FAIL <assertion>`** — which makes a flake structurally unable to
  impersonate a regression, on any box.

### 🎯 37k — the flag cleared, and deliberately nothing else

Owner's ruling: *check Theme 30's `service` axis first, enter no data until
it's settled.* **Settled: style is not that axis** (ADR 0077). They sit at
different levels — Theme 30's `service` is metadata about a *vocabulary term*,
style is data about a *venue* — and it **cannot reach 33 of 55 venues**, which
carry no service-axis cuisine value at all. On his own poles, "silver service"
is formality and "quick eats" is speed; the axis captures **format**, which
equals neither: `Gastropub`, the corpus's most-used cuisine value at 10 venues,
implies neither.

- 🛑 **A naming defect in shipped code, hit by three sessions from three
  directions in one day.** `filters.js` already ships
  `service: 'all'|'takeaway'|'dine-in'` on 55/55 venues; Theme 30's `channel`
  is a second meaning; a `service` axis label would be a third.
- 🚩 **`vibe` is precached to every phone and no screen renders it** — zero grep
  hits in `site/`, while ARCHITECTURE describes it as chips on cards. 37k
  proposes a filter on a field that fails ADR 0047's gate today.
- 🎯 **Two owner questions left open rather than resolved quietly**: his relayed
  ruling *"dining style folds into `vibe`"* contradicts 37k's own text (a
  free-text field yields no filter), and `priceBand` — the app's only curated
  judgement field — is filled on **8 of 55**, which is the measurement that
  predicts a style field never gets populated.

### 🔎 Facts corrected by measuring rather than reading

- **`serves` coverage is 7 of 24, not 3.** Four more recipes state a yield in
  prose (`"Makes 21"`, `"Makes 10–15"`). Surfacing those invents no facts.
  ⚠️ Liège Waffles states 12 in `serves` **and** "divide into 12 portions" in
  `steps[3]`, so a scaled recipe contradicts its own method.
- **18b is not blocked on 17a** as recorded — the seam it needed is the one now
  built. Its real blocker is data: **cup and spoon units are 55% of all
  unit-bearing lines**, and the only in-corpus evidence of which cup the owner
  means is a parenthesis (`¾ cup (190 ml)` ⇒ 253 ml ⇒ NZ).
- **36b has almost nothing to bind to.** Only **2 steps in the entire corpus**
  carry a scalable amount, so `uses:[{ingredient, amount}]` is data entry
  first and schema second.
- **`ARCHITECTURE.md` said `ingredients: list of strings`** — stale since
  ADR 0070 enforced the two-shape union. Corrected.

### The dull one that bit anyway

A commit with a `docs:` subject edited a **comment** in `site/js/recipe.js` and
owed a `SHELL_VERSION` bump. `check_versions.py --range` caught it after the
push; the bare form would not have, because the tree was clean.
🔑 **The gate reads paths, not your subject line** — already recorded, and it
still caught this session.

### Machine hygiene

Reaped at session open: **4 orphan headless Chromes** (10–11 h) and **2 stale
Python listeners** on 18080/18081 (21 h). The Python ones turned out to belong
to another repo — `browser.mjs` serves in-process on port 0 and structurally
cannot leak a port, which a peer corrected and this session verified three ways
rather than accepting. 🔑 **"Right about the hazard class, wrong about this
repo"** is worth saying out loud: the retracted framing would have sent a reader
hunting a leak that cannot exist.

