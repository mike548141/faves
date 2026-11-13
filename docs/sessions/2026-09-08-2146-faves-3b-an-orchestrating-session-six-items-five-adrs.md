## 2026-09-08-2146 → 2026-09-09 — faves-3b: an orchestrating session, six items, five ADRs, and a red `main` we put there

Eight sub-agents in worktrees, six PRs merged, no peer faves session live for
the duration (`ListAgents` at close: 14 peers, none on this repo).

### 🛑 What broke, first

**`main` was red on `tools/products.py` for three merged PRs, and this session
caused it.** PR #31 added `readAlso`/`readAlsoBy` to `data/intake/not-products.json`;
`NOT_PRODUCT_KEYS` is closed on purpose and refused them. It surfaced only
because a *different* agent, on unrelated work (`500/060`), ran the gate its
brief told it to. Fixed at `adf855b` — both readings preserved inside the
existing schema, no key set widened, because that is not a delivering session's
call. Filed as `340/290`.
🔑 **Three things independently failed, and the first is the orchestrator's:**
the delivering agent's brief named eleven gates and not this one, because
nobody writing it connected *"you are editing `data/intake/`"* with
*"`products.py` validates `data/intake/`"*. **The brief was the gate.** CI does
not run `products.py`; and the commit's own verify list omitted it, so the
record of how the change was checked was true about what ran and silent about
what did not.

**This session also signed 17 records `faves-p1`, a name that names nothing.**
The real one comes from `ListAgents` and is `faves-3b`. Corrected at `abea40f`.
A session that invents its own identifier leaves every back-reference dead.

**And it wrote a second item onto a number already taken** — `cat >>` onto a
guessed filename creates the file rather than appending. Caught before the
index was rebuilt, so it never reached `docs/ROADMAP.md`. `test -f` before
appending is the whole fix.

### Delivered

| Item | Outcome |
|---|---|
| `210/080` | Search never consulted `lifecycle` at all — a shut venue **led** both "Japanese" and "Sushi". Demoted, and the row now carries `closureBadge`. ADR 0111 |
| `340/260` | `tools/lib/tree.py` — 26 Python gates name the tree they read. CLAUDE.md's claim was false for all of them; the item said six. ADR 0113 |
| `500/020` (b029) | Nothing was lost: all 179 Churton prices match to the cent. ADR 0112 |
| `500/060` | ADR 0090's *"No location, ever"* superseded — it forbade what it never meant to. ADR 0115 |
| `490/050` | Decomposed into twelve items (`310/050`–`310/160`) after the owner's ruling |
| Board hygiene | 12 items corrected against measurement |

### 🔎 Findings that changed what a record said

- **Answering "was a price layer lost?" with *no* was worth more than a yes.**
  Checking meant opening the venue's other evidence, which showed the *held*
  layer was misdated: 179 prices labelled `2019` were read on **2026-07-06**.
  The ADR 0023 retrofit had dated them from the only other file in the folder —
  one folder read as one document. Churton's price-rise window goes from **seven
  years to five weeks**, and it also removes ADR 0023's own cited instance for
  rejecting full-precision dates. `check_provenance` cannot see this class; ADR
  0112 says so rather than letting its green read as coverage.
- **The `340/260` item named six gates; there are 26.** Twenty were hidden,
  including three id seeders and seven tool test-suites, four of which only CI
  runs.
- **`to_top_check`'s sibling lesson recurred:** the gate agent's own self-test
  caught two defects before they shipped — `SHELL_VERSION` parsed from a comment
  seven lines above the assignment, and `git rev-parse --abbrev-ref HEAD --short
  HEAD` answering the branch name **twice**.
- **`490/030` claims the owner's reversal "lives only in a code comment".
  False** — ADR 0089:122-133 carries it verbatim. Left standing, the likely
  outcomes were a duplicate superseding note or a session **editing an accepted
  ADR** believing nothing covered it.
- **`040/020` asserts an "Owner GO 2026-07-24" with no supporting record**, and
  its live 5-step build order ends by telling a session to re-wire
  `site/js/route.js`, which does not exist. Marked, not closed: he removed route
  *ranking*; the free-text destination and unified search bar were never ruled
  on.
- **Neither number in `490/050` survived.** "348 size-ladder rows" is
  unreproducible; the truth is **336 offers on 187 rows**, and the ids actually
  at risk belong to a population nothing counted: **133 groups / 381 rows / 248
  surrendered ids**. Smaller than feared where it was measured, larger than
  described where it was not.

### 🚩 The board's real bottleneck, measured

**29 of 70 open items carried a 🎯 owner-decision marker.** A read-only audit of
all 29 found **9 that should never have reached him** — 6 already ruled (one
ruled *twice*, because the item never recorded the first answer), 2 stale on
measurement, 1 not a decision at all (its 🎯 was a *cross-reference* to another
item's marker). The list had been built by grepping for the glyph.
🔑 **And the mechanism underneath it:** `SESSIONS.md` mostly carries one-line
summaries and points at the roadmap item as *the* record. So for most of this
board the item asserting a ruling **is** the only source — which is exactly how
a record gets stronger than its source. **Six of the twelve quotes the audit
checked exist nowhere but the item asserting them.**

### Owner rulings, 2026-09-09

1. **Allergens (`080/210`)** — fix the two false `contains-gluten` tags **and**
   read image `alt`. He took the widest of four options.
2. **Sizes (`490/050`)** — *"if someone hearts 'Large Butter Chicken', have they
   hearted a dish or a size?"* → **the dish**. One dish, choice at order time.
3. **Location rule (`500/060`)** — **reword AND open the shop case**,
   overruling the item's own recommendation of reword-now/shop-later.
4. **The API key (`500/010`)** — *"I want you to do it — you have access using
   the shed repo"*, superseding his own earlier ruling that only he may.
5. **The dietary blocker (`310/060`, 28i)** — merge the 97 groups whose claims
   already agree; settle ADR 0048 §3 separately.
6. **The heart (`310/070`, 28j)** — **silently absorb it** onto the base dish.

🛑 **Ruling 2 could not be built as stated, and the decomposition found it.**
ADR 0048 §3 — *"dietary claims intersect"* — means composition can only ever
*remove* a claim. Verified in the corpus: `Falafel kebab` carries `v`,
`Chicken kebab` does not, so a merged `Kebab` could never be vegetarian again.
**58 rows across 36 groups** would lose a claim. Put back to him with the
measurement; he chose the split. **This is the session's best argument for
decomposing before building.**

### ⏳ Left owed by him

- **`500/010`** — the key. Blocked on one `gcloud auth login` in his own
  terminal; every call from a session returns a re-auth prompt it cannot answer.
  A challenge is on the record and unanswered: **delete** may beat **rotate**,
  because the registry says nothing uses it, the only consumer is two finished
  one-off scripts, and rotating replaces a live bearer credential with a live
  bearer credential.
- **`500/060`** — he corrected the premise (*"there are photos of products and
  menus taken in the restaurants"*). Measured in response: **menu** photographs
  yes, 63 of 67 with GPS at 12 locations, and already load-bearing for
  `verifiedBy: in-store`. **Product** photographs, no — all 119 GPS-bearing
  pantry frames cluster at **one** location, 64 carry none, and every one of the
  15 records mentioning a retailer is a brand name, a manufacturer address or a
  website lookup. Which corpus he means decides whether a schema field is built
  on a real case or a misreading.

### Close

✅ `main` green on the full verify list, re-run at close rather than assumed:
`validate` 57 · `test_validate` 147 · `test_tag_allergens` 68 ·
`test_tag_addon_options` 25 · `split_data --check` 227/227 · `products` 87/87 ·
`check_precache` · `check_records` · `check_provenance` · `intake_index` ·
`recipe_estimates` · three id seeders · `node --test` **1297** ·
`boot_check` **24**. ✅ Stash stack empty, 0 orphan Chromes, no branches but
`main`, no open PRs.

