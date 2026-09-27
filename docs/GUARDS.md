# Guards — what each one buys, and what it costs

This is the declaration pass for roadmap item
`340/100` ("Every guard here must declare: cheap failure, or forbid the
act?"), applying atelier's `GUARDS.md` § *the fourth requirement* and
`PRINCIPLES.md` §10 *Posture* (pin `e2fddc5`) to every guard this repo
actually runs. It does not decide anything — per the item's own limits,
a guard that fails this test is a **finding for the owner**, never a
revert, and "forbids the act" is not a failure grade.

## The two postures

From atelier's `GUARDS.md` (quoted, not restated in our own words, because
the wording is the test):

| Posture | What it does | What it costs |
|---|---|---|
| **Makes the failure cheap** | The bad event still happens and is survivable — recoverable, rotatable, restorable, reversible | Building the recovery |
| **Forbids the act** | The bad event is prevented by removing the ability to perform it | Freedom of action, permanently |

Both are legitimate. The defect this document exists to close is an
**undeclared** choice, not either answer.

## How the population was enumerated (2026-09-28)

Not from this item's own prose, or CLAUDE.md's — both have drifted from
the tree before (the item's own 13→18 correction). Recounted from source:

```
ls tools/*_check.mjs | wc -l                              → 18  (browser checks)
grep -l 'lib/browser' tools/*_check.mjs | wc -l            → 18  (all of them, confirmed)
grep -c 'run: node tools/' .github/workflows/ci.yml        → 1   (boot_check, only one)
ls tools/*.py | wc -l                                      → 43  (Python tools, incl. non-guards)
grep -c '^    Scanner(' atelier/tools/floor.py             → 15  (registered house scanners)
```

Plus a diff of every `tools/*.py`/`tools/*.mjs` path named in `CLAUDE.md`
against every one named in `.github/workflows/ci.yml`: CI's `guard` job
runs three test-suites (`test_registry.py`, `test_find_addons.py`,
`test_check_versions.py`) that are not in CLAUDE.md's verify fence at
all, and `tools/fixture_check.mjs` is on neither CLAUDE.md's fence nor
CI — confirming the item's own finding that it is the least-visible
guard in the repo. These naming gaps are **not** re-litigated here (that
is CLAUDE.md's own upkeep); they are named because an unlisted guard is
a guard nobody is told to run, which bears directly on posture below.

## Guards this repo does not declare — they are atelier's

The 15 registered house scanners (`secretscan`, `leakscan`,
`conflictscan`, `linkscan`, `reviewscan`, `publishscan`, `sizescan`,
`board`, `datescan`, `wrapscan`, `spellscan`, `harvestscan`,
`pointerscan`, `pathscan`, `licenscan`), plus `signscan` (run as explicit
steps in atelier's reusable `floor.yml` because it is not a tree
scanner), are inherited from atelier's `tools/floor.py` registry <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tools/, not this repo's tree -->
and run here via `.githooks/pre-commit` (hook plane) and
`.github/workflows/floor.yml` (CI plane, calling atelier's reusable
workflow). **Their posture is a house-level declaration, not a repo one**
— a claim true of any child sharing none of our stack belongs in
atelier's registry (beside its `why` field, per `GUARDS.md`'s stated
home), not copied or re-derived here. Naming them and pointing up is
this repo's whole obligation; declaring `cheap`/`forbid` for
`secretscan` in this file would be re-deriving a house answer locally,
which `CLAUDE.md`'s own "A house rule is not ours to write" section
already forbids for the parallel case of roadmap content.

Two of the fifteen are narrowed here, and the narrowing (not the
scanner) is ours:

- `pathscan` — scoped to the live documents (`docs/roadmap`,
  `docs/decisions`, `docs/ARCHITECTURE.md`, `docs/WORKPLAN.md`,
  `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `tools`), excluding
  record stores. `pathscan` itself never blocks in this house — both its
  hook and CI templates carry `--warn` unconditionally (floor.py: "THE
  FLIP TO BLOCKING IS A SEPARATE RULING") — so this narrowing cannot
  itself flip a cheap-failure check into a forbidding one; it only
  changes what gets reported.
- `licenscan` — opt-in only when a repo declares a licence; faves
  declares `Apache-2.0`, so it runs.

## This repo's own local floor check

| Guard | Where | What it guards | Declared posture | Reason |
|---|---|---|---|---|
| `tools/check_images.py --staged` | hook (`.atelier-floor.json` `local.image-location`) | no staged image carries GPS/location or unvetted metadata | **Forbids the act** (already declared in `.atelier-floor.json`) | a location committed to this public repo is unrecallable — git history is permanent — so there is no recovery to build; removing the ability to commit it is the only correct answer |
| `tools/check_images.py` (no `--staged`) | CI, `guard` job, whole tracked tree | the same rule, backstop | **Claims cheap-failure by running-after; actually delivers neither** — see below | |

🚩 **Flagged mismatch.** The CI invocation is the *same rule* the hook
forbids, but it runs on the whole tracked tree **after** a push has
already deployed (this repo's own stated fact: "a push IS a deploy").
For most repo-invariant gates that is an acceptable cheap-failure
delivery — the bad state is corrected by a follow-up commit. It is
**not** acceptable here, because the event this check exists to catch
(a GPS-bearing image entering permanent, public git history) is the one
class of failure this repo has already ruled has *no* buildable
recovery (`ADR 0128`, and the hook's own stated reason above). So the CI
half is not "makes the failure cheap" in any sense the rest of this
document uses that phrase for — it is a smoke detector for a fire that
already happened and cannot be un-burned. Its only real value is
catching what the hook could not see (a clone with the hook not
installed, a web-UI commit, `--no-verify`), which is a **detection**
guard for an **unrecoverable** event, the exact combination
`PRINCIPLES.md` §10 names as having "the least mechanism behind it."
This is a finding for the owner under the item's own terms, not a
revert: the fix, if any is wanted, is prevention further upstream
(branch protection actually blocking, or a server-side pre-receive
check), not something this CI step can become by editing its own code.

## Repo-invariant / data-integrity gates

These are the CI `guard` job (**"repo invariants"**), the `validate` job
(**"menu data validates"**), and the `versions` job
(**"service-worker version lockstep"**) — all run again by hand from
CLAUDE.md's verify fence. All of them inspect committed data or repo
state and print a report; none removes anyone's ability to write the bad
state in the first place. **Declared posture, as a group: makes the
failure cheap** — the bad state is a line in a git-tracked, editable
file, corrected by a follow-up commit and a re-deploy. Reason, shared:
nothing in this group guards data that is unrecoverable once wrong (that
class is `check_images.py`, above, and is handled separately).

| Guard(s) | What it guards |
|---|---|
| `validate.py`, `test_validate.py` | menu JSON validates against the schema (124 mutation cases prove the gate fires) |
| `seed_dish_ids.py` / `seed_section_ids.py` / `seed_branch_ids.py` / `seed_option_ids.py --check` | every dish/section/branch/add-on option carries its own id |
| `check_no_deps.py`, `gen_sbom.py --check` | the zero-dependency invariant (ADR 0001) and its published SBOM |
| `check_visibility.py` | CLAUDE.md's stated repo visibility matches GitHub's actual setting |
| `check_fallback.py` | the no-JS `<ul>` mirrors `site/data/index.json` |
| `check_precache.py` (+ `--self-test`) | every path `sw.js` precaches exists in `site/` |
| `check_decisions.py` | every ADR is in the allocator index |
| `check_versions.py --range` (+ `test_check_versions.py`) | `sw.js`'s version constants bumped in lockstep with `site/` |
| `split_data.py --check` (+ `test_split_data.py`) | a menu refresh appended history rather than destroying it, joined by id |
| `check_records.py` (+ `--selftest`) | `data/images/` and `data/withdrawn/` — file→row provenance completeness |
| `check_provenance.py` (+ `--selftest`) | a venue's `verified` date is not fresher than the evidence it was read from |
| `products.py`, `products.py --coverage --probe`, `intake_index.py --check` | the packaged-product record store and intake coverage |
| `recipe_estimates.py --check` | cook-mode countdowns line up with the recipes and name their source |
| `fetch_fx.py --check` | the shipped exchange rates load |
| `tools/lib/tree.py --self-test` | the tree-identity line every gate prints still tells two trees apart |
| `test_registry.py`, `test_find_addons.py`, `find_variants.py --selftest`, `test_tag_allergens.py`, `test_allergen_disagreements.py`, `test_tag_addon_options.py` | the authoring tools behind the data, not the shipped data itself — a failure here means a broken tool, never a wrong allergen on a phone |
| `node --test` | JS unit tests (pure logic) |

**One named exception inside this group:** `check_stashes.py` warns only
by explicit design ("WARNS and never mutates; an entry is not a
delivering session's to drop") and is deliberately **not wired to the
hook or CI at all** — its own header explains why: in pre-commit one
live stash would block every commit in the repo for a peer's work, and a
CI clone's stash stack is empty by construction. Its posture is still
**makes the failure cheap** (an unpopped stash is recoverable — the
finding is reversible, nothing is lost), but its *wiring* is weaker than
the rest of the group by design, not by omission: `--selftest` is the
only proof it still fires. Worth naming here precisely because it looks,
at a glance, like the same undeclared-wiring gap the browser checks
have below — it isn't; this one's absence from CI is a stated ruling,
not a silent drift.

## The 18 browser checks (`tools/*_check.mjs`)

**Declared posture, as a group: makes the failure cheap.** Every one of
these drives a real browser, reports what broke, and removes nobody's
ability to ship the bug it catches — a developer (or an agent) can
commit and push a regression these checks would have caught with no
mechanism stopping them. That is the correct posture for this class:
each one exists because a *unit test* already missed something (their
own headers say so, repeatedly), and the recovery — read the failure,
fix the code, re-run — is cheap and immediate once someone runs the
check.

🚩 **The wiring does not support the declaration, for 17 of the 18.**
Only `boot_check.mjs` runs anywhere but a human's terminal — it is CI's
`boot` job (**"every screen boots"**), added to `protect-main`'s required
contexts 2026-08-17. The other seventeen —
`addon`, `branch`, `cook`, `device`, `distance`, `filter_row`,
`fixture`, `focus`, `geo`, `midnight`, `note`, `picks`, `precache`,
`recipe`, `served`, `sync`, `to_top` — run **only when a human or an
agent types them**, per CLAUDE.md's own admission repeated at the foot
of its verify fence. "Makes the failure cheap" presumes the failure gets
*noticed* — `PRINCIPLES.md` §10's own precondition, "we will know if
something goes wrong," is exactly the leg with no mechanism behind it
here. A cheap-failure guard nobody runs is not cheap, it is **absent**,
and the repo's own history proves it: `sync_check.mjs` sat dead through
a whole settings refactor with CI green throughout, found only because
someone finally typed it.

`fixture_check.mjs` is the sharpest instance of this: it is not only
missing from CI, it is missing from **CLAUDE.md's own manual list** —
the one surface that tells a human which sixteen (now seventeen) checks
to type by hand. Nothing currently points a session at it at all except
this document, ADR 0109, and the two roadmap items that named the
undercount.

**This is not a defect in any one check.** It is the shape the item's
own 🚩 already names: seventeen guards whose declared answer
("cheap-failure, because it's reported and fixed") is unsupported by
their wiring. Filing that shape is the point of this pass; unwiring or
re-wiring any of them on this session's own judgement is exactly what
the item's inherited limits forbid.

## The CI meta-layer: `protect-main` and the six required contexts

`protect-main` (`gh api repos/mike548141/faves/rulesets/20597160`, read
2026-09-28) requires six status contexts before a PR can merge:
`floor / scanner floor`, `menu data validates`, `JS unit tests`,
`service-worker version lockstep`, `every screen boots`, `repo
invariants`. The word "required" **claims forbids-the-act** — a merge
that hasn't passed these should not be possible.

🚩 **The mechanism cannot deliver that claim, and it is measured, not
inferred.** Two independent reasons, both already on this repo's
record:

1. `bypass_actors` carries `{"actor_id": 5, "actor_type":
   "RepositoryRole", "bypass_mode": "always"}` — confirmed live on this
   ruleset today (`current_user_can_bypass: "always"` in the same API
   response). A direct push to `main` **is** the normal path here (push
   = deploy), and it bypasses all six checks unconditionally.
2. Even without the bypass, a required check can never gate a **direct
   push** in principle: the workflow that produces the status starts
   *after* the ref has already moved, so at push time all six report
   "expected," not pass or fail. CLAUDE.md's own record of a bypassed
   evaluation shows exactly this (`required_status_checks | fail | 6 of
   6 required status checks are expected`). The one non-bypassed pass on
   record is a **PR merge** (#7), where the checks had already run
   against the PR's head before merge — the mechanism only ever forbids
   anything on the PR path, never on a direct push to `main`.

**So the declared posture (forbid) and the delivered one (report, and
only after the fact) are in direct conflict for this repo's normal
workflow.** The honest declaration for `protect-main`, as actually
wired here, is: **makes the failure cheap to notice, not cheap to
undo** — CI still runs and still reports, which is real value (it is
why `sync_check` going quiet was ever going to be discoverable at all),
but the six-context requirement buys none of the "cannot merge broken
work" guarantee its name implies on the path this repo actually uses.
Narrowing the bypass would convert this repo to PR-only merges — a
bigger decision than this document can make, already sitting on the
board as its own item; this section is confirmation, not a new finding.

## The service worker's install guard (`site/sw.js`)

**Declared posture: forbids the act**, and it is the one clear
prevention guard in the product code itself. The `install` handler's
`if (!res.ok) throw new Error(...)` (guarding the `SHELL` and `DATA`
precache fetches) aborts the whole install the moment one asset comes
back non-OK, which stops the new service worker from ever activating a
**partial** cache — the phone keeps serving the old, still-complete
cache until a install that fully succeeds comes along. The alternative
— catching the error and precaching what did succeed — would leave some
installed phones holding a shell with a hole in it, discoverable only
when a user hits the missing page offline; there is no cheap recovery
from that once it has shipped to an arbitrary number of phones with no
inbound channel to push a fix except another successful install. Rather
than notice and recover, the guard removes the ability for a broken
install to complete at all.

🚩 **Named, not new: this guard's own blind spot is why
`check_precache.py` exists, and that check's posture chain is worth
tracing.** `!res.ok` cannot see a path that Cloudflare Pages answers
with `200 text/html` for a path it does not actually have (ADR 0100,
confirmed by curl on Pages) — the exact shape a missing precache entry
takes. So the install guard's forbidding power is only as strong as
`check_precache.py` catching the bad path **before** that install ships
— and `check_precache.py` is a makes-cheap, report-after-push gate
subject to the same protect-main mismatch above. A prevention guard
downstream of a detection guard that cannot forbid anything is not a
defect in either guard individually; it is the chain worth seeing
whole, and it is why `check_precache.py --self-test` exists (nine
cases, one the unmutated tree) — proving that link still catches the
one input the install guard structurally cannot.

One more nuance inside the same handler, because posture is per guarded
class, not per file: the `fx.json` fetch inside `install` is
**deliberately not gated the same way** — a comment in `sw.js` reads "Not
`requireAsset`: this one must never reject the install." A failed FX
fetch degrades to no currency conversion rather than blocking the whole
shell from installing. That is the opposite posture (**makes the
failure cheap** — the app still works, degraded) chosen correctly for a
non-critical asset, inside the same function that forbids for the
critical ones. One file, two declared postures, by design.

## Summary tally

| Group | Count | Declared posture |
|---|---|---|
| Inherited atelier scanners (hook + CI, `floor.yml`) | 15 registered + `signscan` = 16 | Atelier's to declare — not ours |
| `check_images.py`, hook (`--staged`) | 1 | Forbids the act |
| `check_images.py`, CI (whole tree) | 1 | Claims cheap-failure; flagged as delivering neither, given the class it guards |
| Repo-invariant / data-integrity gates | ~28 tools across `validate`/`guard`/`versions` CI jobs | Makes the failure cheap |
| — of which, deliberately unwired by design | 1 (`check_stashes.py`) | Makes the failure cheap; wiring gap is a stated ruling, not drift |
| `node --test` | 1 | Makes the failure cheap |
| Browser checks (`tools/*_check.mjs`) | 18 | Makes the failure cheap, declared — 17 of 18 flagged: wiring does not support the declaration |
| `protect-main` (6 required contexts) | 1 mechanism | Claims forbids the act; flagged as delivering makes-cheap-to-notice-only, and only after deploy, on this repo's normal (direct-push) path |
| Service worker install guard, `SHELL`/`DATA` | 1 | Forbids the act |
| Service worker install guard, `fx.json` | 1 | Makes the failure cheap (deliberately, same handler) |

## What is owed, not decided here

Per the item's own limits, this document declares; it does not act.
Three things are flagged above as findings for the owner rather than
fixed:

1. `check_images.py`'s CI invocation reports on an unrecoverable class
   after the fact — the class the hook was built to forbid.
2. `protect-main`'s six "required" contexts cannot forbid a direct push
   to `main` in this repo's normal workflow, bypass or no bypass —
   already tracked as its own roadmap item; this document adds no new
   claim, only confirms the mechanism against today's live ruleset.
3. Seventeen of eighteen browser checks declare a posture (cheap
   failure) that depends on detection, and nothing wires their
   detection to run without a human typing it — `fixture_check.mjs`
   most acutely, being absent from CLAUDE.md's own manual list too.

None of these three is this session's to resolve; each is exactly the
shape the item asked this pass to surface.
