## 2026-08-17-0100 — the menu fetch was already finished, and three rulings fell out of saying so

Asked for a full list of open work by theme, then told to do the second of the
owner's two picked-next items — **"the remaining 14 venue menus"**. It was
already done. Reporting that honestly, rather than performing the fetch, was the
whole first half of the session.

### 🔎 The finding: measure the corpus, don't read the item's title

The zero-dish reproducer says **18 venues carry no dishes**, and every one of
them is unfetchable — 14 publish nothing at all, and 4 publish a website with no
menu on it (`babaili-malatang`, `caffiend`, `kaffee-eis`, `new-chapter-cafe`).
The owner authorised fetching **18** venues that publish their own menu; 14 were
transcribed and 4 turned out to publish no menu. **The authorisation is
exhausted.** Corpus: 37 venues with menus, 3,059 dishes.

🔑 **The item outlived three of its own titles** — "six venues", then "the
remaining 14", then the owner's brief repeating 14 — because each was typed from
prose while the reproducer sat six lines below saying otherwise. The count
nobody typed was right every time. Same trap as the stub count (stale three
times) and the chain/branch count one item above it: **a hand-copied tally is
wrong the moment data lands, and it reads identically to a true one.**

⚠️ **I put the stale item in a summary to the owner as open work before checking
it.** The correction cost nothing here, but the first answer was drawn from the
roadmap's prose rather than from the tree, which is the exact failure the file
warns about in three separate places.

### ✅ Three owner rulings

1. **An unpriced row is a RECORD — always keep it, flagged `needs: price`.**
   Settles the split the fetch created (Subway kept 141 unpriced rows; The
   Victoria Tavern's agent dropped ~40 spirits) and **overrules** the convention
   read from `southern-cross`/`the-borough-tawa` — those are venues that happen
   to have no unpriced lines, not evidence of a rule. Dropping is lossy;
   keeping is not. Consequence filed as its own item: restore the spirits.
2. **22b and 22c are ONE piece of work**, superseding the unratified "22c
   first, or at least alongside". The owner accepted the cost — Favourites
   keeps stranding for the whole `[L]` — so a partial 22b is now the one
   outcome the ruling rejects.
3. **37k: check Theme 30's `service` axis first**, no data entry. Relayed to
   `faves-cook2`, who holds the claim.

🔑 **Two peers independently challenged ruling 1 on [ADR 0047] grounds — "name
the screen that renders `needs: price`" — and the code answered both.** `needs`
already ships: 166 dishes carry it, `price` is in the vocabulary, `validate.py`
enforces it, and `needs.js priceUnknown()` drives `menu.js` to print **`?`**
where a bare missing price prints `—`. A convention change, not a schema change.
One peer reasoned from a *test name*, one from an *ADR*; the answer was one grep
away. **Read the code, not the artefact that describes it.**

### 🛑 The index is a shared surface too — a new instance of the parallel-session class

`faves-ea` and I were both in the **primary checkout**, both editing
`docs/ROADMAP.md`. The known hazard is the working tree. The one that actually
bit is that **the index is shared as well**: they had `git add`-ed four hunks,
I staged two more, and for about a minute a commit from either of us would have
landed the other's work under the wrong message.

🚩 **`git status` shows one modified file and looks completely normal.** The
check that sees it is `git diff --cached -U0 | grep '^@@'` — compare the hunk
headers against what you believe you wrote. Both sessions have adopted it, and
it caught a second, non-cross-session fault within minutes (a peer's own staged
content gone stale against their own working tree after a harvest).

🔑 **And `git add -p` is interactive, so the harness cannot hand-pick hunks the
normal way** — which is *why* both of us reached for `git add`. The
non-interactive equivalent, used here to stage and then to un-stage cleanly:

```sh
git diff -U0 <file> > full.patch        # filter hunks by their @@ -N old-line
git apply --cached --unidiff-zero mine.patch
git apply --cached -R --unidiff-zero mine.patch    # the undo
```

### 🚩 Left for the owner

- **Direct pushes to `main` are landing via a ruleset BYPASS** — every push this
  session printed `Bypassed rule violations for refs/heads/main: 4 of 4 required
  status checks are expected.` Spotted independently by `faves-f2`. So the
  required checks are not gating `main`; they run after the fact. This interacts
  directly with the open item to wire `boot_check` into CI — a required check
  that can be bypassed is the decorative-guard pattern at the branch-protection
  layer.
- **Two of the fetch's three questions remain his**: whether Pizza Hut's prices
  are Johnsonville's (one phone call), and Little Sprig Seatoun's contested
  menu date.
- **All 18 remaining stubs are an errand list, not session work** — only a photo
  or an in-store visit clears any of them.

