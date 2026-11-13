## 2026-09-07-0141 — an orchestration session: three agents, and four verdicts that were wrong

**Session `faves-b1`, orchestrating.** No other faves session was live
(`ListAgents`: nine peers, all `shed`/`cbom`/`docker-heap`). Three sub-agents in
their own worktrees, plus work taken directly. **32 commits, four items closed,
six findings filed, all merged and deployed.**

🔑 **The through-line: every substantial thing delivered this session began by
disbelieving a written verdict.** Not one of the four was malicious or careless
— each was true when written, or true of the sample in front of its author.
That is what makes them expensive.

| The record said | The measurement said |
|---|---|
| `contains-fish` is *"not takeable without the owner"* (faves-24's close) | Its stated blocker — 37n's **report** — shipped 2026-08-16. Takeable, and shipped. |
| *"18 stubs remain and NOT ONE is fetchable … the other fourteen publish nothing at all"* | **9 of 13 publish a website; 5 publish a priced menu.** Not a near miss. |
| Rock Yard names fish sauce *"in a dozen dishes"* with a badge printed *"Fish"* | **Three** dishes. No badge anywhere in the record. |
| `to_top_check` *"sweeps the whole document"* (corrected 2026-09-07, and this session confirmed the correction holds) | Now genuinely 3,452 positions. ✅ |

### 1. Fish is an allergen Faves warns about (Theme 5 `010`, ADR-less by design — owner-ruled 2026-08-16)

**199 tags across 32 of 57 venues**, 3,175 dishes read. The app warned about
fish **zero** times before today.

🔑 **The item's stated blocker was discharged and nobody had checked.** It read
*"blocked on 37n's report existing, not on a decision"*; the report
(`tools/allergen_disagreements.py`) shipped three weeks earlier. The *human
sweep* half of 37n is still owner-blocked — a different act, and the conflation
is what kept this closed.

**Verified before merging, independently of the delivering agent's report:** an
orchestrator-side scan of the branch agreed on 199 tags / 32 venues, and all
three named traps hold — Subway's Tuna Mayo is `contains-fish` and **not**
`contains-shellfish`; Regal's jellyfish is untagged (`\bfish\w*` closed at the
start); Charley Noble's *"mustard seed caviar"* is untagged while the Oscietra
Caviar two rows away tags. Both narrowings are **lookbehinds, not `exclude`s**.

🛑 **It exposed a live safety gap, filed as `110/040` and verified on shipped
data.** `sprig-and-fern-tawa`'s **Salmon** add-on carries `has-fish` only; the
allergen union reads `contains-`-prefixed tags, so **a reader who ticked "avoid
Fish" and adds salmon is told nothing.** ADR 0048's `addon_check` passes because
it is exercised against a *peanut* option. `contains-fish` did not cause this
and removing it would not fix it — landing the allergen made an existing silence
*visible*, and a promise kept on one screen and broken on the next is worse than
never offering it.

### 2. A close before its open means the next day (`190/010`, ADR 0094)

Dragonfly trades to 3am Fri–Sat; the app said it shut at 12:01am. Owner ruled
option 1 with three options and their costs in front of him.

📊 **The caveat he attached was the work.** *"Every existing record must be
checked — verified, never assumed."* **507 spans, 155 files, 72 hours/served
blocks, 957 time strings; 0 would newly wrap.** 🔑 **The zero was
positive-controlled** — the detector was run against synthetic records of all
five shapes it must reach and caught every one. *A sweep that finds nothing and
was never shown finding something is not evidence.*

🚩 **Two things nobody anticipated, both blocking:**
1. `validate.py` **hard-errored** on `c <= o` — the ruling's own data could not
   be written down. `TIME_RE` untouched, as the item predicted.
2. **A Saturday night ends past the end of the week.** Sat 16:30–03:00 runs to
   absolute minute 10260 where the week is 10080, so Sunday 1am is minute 60 and
   direct containment cannot see it. This is the **exact** edge ADR 0006 named
   when it rejected the wrap in 2026-07 — 0006 was right about the cost and
   wrong only about the premise that no venue would need it.

🔎 **Found unasked:** `overlapping()` compared times as **strings**, so
`[["16:30","03:00"], ["20:00","22:00"]]` — a real clash — sorted apart and was
never seen. Both halves **break-probed**: restoring the old arithmetic fails 8
unit + 9 browser assertions and no control; deleting *only* the week-boundary
re-ask fails exactly 2 + 3, all naming Sunday.

### 3. Five of the thirteen stubs were fetchable (`080/190`)

Owner was offered a **report-only** sweep as the recommendation and **took the
wider option** — re-check and fetch. That ruling is what makes the transcription
legal under the menu-content rule; the Dragonfly instruction named one venue and
the previous session was right to stop.

Captured: **Abrakebabra 78 · Hotel Bristol 79 · Crepes A Go Go 30 · Dirty Little
Secret 21 · Garage Project 15.** Fallback `<ul>` 40 linked/17 stub → **45/12**.

🔑 **Why the old sweep missed them, which is the reusable half.** Abrakebabra's
site is `kebabcentral.co.nz` — a domain carrying **none** of the venue's name.
Crepes A Go Go's menu is two **images**, so a text sweep finds no dish and no
price. A sweep keyed on the record's own `website` field or on a guessed domain
reports "publishes nothing" *indistinguishably from having checked*.

❌ **The refusals matter as much:** two printed dietary claims we believe false
were **not** transcribed (a `VEGE` marker on a smoked-salmon crepe; `V`/`VGO` on
a pork croquette) — a wrong vegetarian claim is eaten, not avoided. Hotel
Bristol follows the Star Group menu the corpus already carries twice rather than
inventing a third reading. Abrakebabra publishes no Wednesday hours, so `hours`
stays `null` rather than asserting six known days and one invented closure.

### 4. Taken directly, not delegated

- **`340/190`(b)** — `geo_check` and `served_check` hand-rolled their summaries,
  so CLAUDE.md's *"**every** check prints the tree line"* was false for two of
  fifteen. 🔎 **The fix bought more than the line, and the delivering agent did
  not claim this — it was found reviewing the merge.** `report.summary()` also
  aborts when the transport died; both bypassed it, so a run that **lost its
  browser** could print `OK` and exit **0**. A **false GREEN**, which is worse
  than the false red the section is otherwise about. The item called it *"a
  one-line change"* — accurate about the edit, wrong about the stake. **A defect
  described by its diff size gets triaged by its diff size.**
- **`240/020`** — the version constants are dated **NZ local**, record filenames
  are **UTC**; from midday UTC they name different days (verified on real
  commits at 00:51 and 02:51 NZST). 🛑 **The item told the delivering session to
  record this in ADR 0015 — which is `accepted`, and the repo forbids editing an
  accepted ADR's substance.** A session following its own roadmap faithfully
  would have committed a rule breach. It landed in `ARCHITECTURE.md` + CLAUDE.md
  instead. **A roadmap item's proposed landing site is a suggestion written at
  finding-time, not an instruction.**
- **`210/060` measured** — see below.

### The measurement that answered a question by dissolving it (`210/060`)

Owner ruled *measure first, then I decide*. **The header closure banner and the
sticky contact bar are NEVER co-visible: 0 of 421 swept positions**, across a
chain page (238, 0–8792 px) and a single-site page (183, 0–6746 px). The banner
is gone by y=185; the bar first appears at y=814 / y=703. **Option 1 (leave it)
wins on the item's own stated test** — the taste call goes back to the owner
with the number, and nothing needs building.

🛑 **THE FIRST VALID-LOOKING RUN WAS WRONG AND GAVE THE RIGHT ANSWER.** `app.css`
sets `html { scroll-behavior: smooth }`, so `scrollTo` **animates** — measured,
`scrollTo(0, 5000)` left `scrollY` at **2**. The sweep read 238 "positions" that
were all the same place, and reported `both: 0` — *identical to the valid run*.
Caught only by printing `scrollY`. **A broken measurement that agrees with the
truth is worse than one that disagrees, because nothing invites a second look.**
The sweep now refuses the run if the page did not arrive within 2 px.
🔑 `sync_check`'s header documents this trap and `to_top_check` guards it at
every scroll — **the house knew, in two places a new sweep would not read.**
Filed as `210/070`, with a live victim: `cook_check:1172`'s bare
`scrollIntoView` animates and is followed by a **click**.

### Findings filed, not fixed

| | |
|---|---|
| `110/040` | 🛑 a fish add-on carries no allergen warning — verified on shipped data |
| `210/070` | the harness reads geometry while it is still animating |
| `340/220` | two orphaned stashes; ⚠️ the parent covers creation and use, **not** cleanup |
| `340/230` | the allergen **label** tables have no drift check; the contradiction tables do |
| `340/240` | 🔎 a pushed branch is not a finished agent — **the orchestrator's own error** |
| `110/050`, `190/020` | filed by the stub-sweep agent: seven food words the tagger has never heard of; `hours` cannot say a day is *unknown* |

### Two process facts worth keeping

🚩 **The orchestrator hit the `cd` drift trap it had warned all three agents
about** — one compound `cd` moved the shell into an agent's worktree. Harmless
(the queries named `origin/<branch>` explicitly) but it is the plainest possible
demonstration that **the tree line is a mechanism precisely because the
discipline fails, including for whoever wrote the warning.**

🚩 **And it tore down a running agent's worktree — TWICE**, on a clean tree +
pushed HEAD, which look exactly like a finished agent and are not. Both the
`past-midnight` and `stub-sweep` agents lost their directory mid-verification;
each diagnosed it as a teardown artefact and re-verified against `main`, and
`stub-sweep` opened its report with it. **Nothing lost — luck plus two good
agents.** 🔑 And the count itself is the lesson: `340/240` was filed saying
*"an agent"*, written from the one report in hand, and the second report
doubled it. *A symptom count proves a fault exists, never how many there are* —
the board's own rule, landing on the item that records the board's own error.

### Close evidence

✅ **All SIXTEEN browser checks green on merged `main`**, every one naming
`tree /Users/mike/.pets/faves/site · shell 2026-09-07.10` or `.9`:
`boot` 24 · `midnight` **34 (new)** · `served` 55 · `branch` 84 · `cook` 85 ·
`geo` 22 · `device` 25 · `addon` 21 · `focus` 16 · `picks` 20 · `recipe` 29 ·
`note` 19 · `distance` 19 · `filter_row` 25 · `to_top` 64 · `sync` **16** (the
expected N).
📊 **One flake, and it failed in the RIGHT shape.** `to_top_check` died as a
`HARNESS ERROR` at **exit 2** saying *"nothing here says anything about the
site"*, with **zero** orphan Chromes and a **1-minute load average of 107.28**.
Re-run at `FAVES_CDP_TIMEOUT_MS=60000`: **64/64** on the same commit. Recorded
on `340/200` as the first data point pairing a load figure with a verdict.
✅ Local gates: `node --test` **1169/0** · `test_validate` **140/140** ·
`test_tag_allergens` **30/30** · `validate` 57 files · `check_fallback` 45
linked/12 stub · `split_data`, `seed_*`, `check_no_deps`, `gen_sbom`,
`check_visibility`, `check_decisions`, `board` all clean.
✅ **CI + floor green on every pushed commit**, including `aed35d3`.
🚀 **Deploy verified in production, not inferred:** `faves.pages.dev/sw.js`
serves `SHELL 2026-09-07.10 / DATA 2026-09-07.6`; `abrakebabra.json` serves 78
dishes in 15 sections as `menu-complete`; Subway's three Tuna Mayo rows serve
`contains-fish`.
✅ **No worktree, branch or PR left open. No orphan Chromes.** Two pre-existing
stashes deliberately untouched (`340/220`).

### Owed, and all of it needs the owner

`210/060` the taste call (measured, recommendation given) · `110/040` the add-on
fish gap · `210/070` · `340/190`(a) — and note (a) should now be decided
**with** `340/200`, since a retry changes what `exitFromError`'s fallback should
do · `340/220` the stash drop · `340/230` · `340/240` · 37n's four allergen
calls, which gate a substantial data sweep.
⏳ **Time-sensitive:** ADR 0094 records **DST as untested ground** — every
fixture is NZST June, and a wrapped span crossing the late-September switch has
never been exercised. New Zealand's switch is **2026-09-27**, roughly three
weeks out, and Dragonfly now has four wrapping spans.

