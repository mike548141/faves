## 2026-08-16 04:45 UTC — a filtered list that says so, and lets you out

**The report (owner).** The facet link works, *"but I'm left without a clear way
to get back to a normal Faves experience. Why can't clicking on Malaysian take
me to the search page the user is used to seeing and using, and has a simple way
back to home / normal?"*

**The diagnosis is right; the proposed route is not, and the numbers say so.**
The complaint is real: every other filter on the home screen was pressed *on*
that screen, so the control you pressed is the control you un-press. A cuisine
arriving in the URL was chosen on a different page — you land narrowed having
touched nothing here, and the only undo was a `<select>` in the sticky bar at
the far end of the page, which reads as furniture rather than as the thing
currently doing this to the list. The search screen has always had a ✕ on its
query for exactly this reason. Browse had nothing.

But pointing the links at search would answer a *different question* than the
link promises. Measured across the whole corpus — every cuisine and every area,
facet-filter set versus text-search set:

| | |
|---|---|
| Facets where the two agree exactly | **45 of 51** |
| Where they differ | **6** — and search never *misses* a venue, it **adds** |

The additions are name and address matches, not cuisine ones. Search "Bar"
and you also get 1841 Bar & Restaurant, Charley Noble, Southern Cross and The
Catch Sushi Bar — four venues whose *name* contains "Bar" and whose cuisine is
not. "Pub" returns 6 places of which 5 are not pubs. "Cafe" picks up KC Cafe,
which is Chinese and Malaysian. "Courtenay Place" pulls in three venues that
merely have it in their address. "Malaysian" happens to agree exactly, which is
why the route looked sound from the one example that prompted it.

So: keep the facet filter (it answers the question the link makes) and give it
the affordance search already had.

**What shipped.** An active area/cuisine filter now renders as a dismissible
chip beside the place count — accented, not the quiet grey of the neighbouring
toggles, because it is the *reason* the list is short. One tap clears the state,
the `<select>`, and the URL param together, and focus lands on the count (which
is `role="status"`, so the restored total is announced) rather than falling to
`<body>` when the chip it was on is removed from the DOM.

🔎 **Squeezing it into the results head was a regression, caught by looking.**
As a third flex column at 390 px it stole width from both neighbours: the count
broke to three lines ("6 of / 48 / places") and the four toggles unstacked into
a single column — far more height than the chip's own row costs. It now takes a
full-width row below them on a phone and sits inline beside the count from
34 rem up, where there is room. Both widths screenshotted.

**The guard held.** `boot_check` gained two more cross-screen assertions (the
chip appears and names what it does; clearing it restores list, control and URL
together) — 15/15, up from 13.

**Verification.** `node --test` **655** · `validate.py` 48 files 0 errors ·
`boot_check` **15/15** · `device_check` 19/19 · `cook_check` 36/36 ·
`check_versions.py` clean (SHELL_VERSION → 2026-08-16.16) · 390 px and 1200 px
eyeballed.

⏳ **Left with the owner.** He asked for the search page specifically. This
delivers the escape he was actually missing while keeping the link honest — but
if he wants the search route anyway, knowing 6 facets over-match, that is his
call and it is a small change to make.

### FX automation, delivered on the third attempt — 2026-08-16

The owner picked the option nobody had costed: a scheduled job that opens a PR
and **auto-merges** it. It shipped, and it was proved end to end rather than
reasoned about — PR #3 opened, the four checks ran, auto-merge landed it, the
branch deleted itself.

Getting there cost two false starts, both worth keeping because they look
attractive from the outside:

- **Push straight to `main`** — refused outright. A direct push can never satisfy
  a required status check, because the check runs on the push the rule is
  refusing.
- **A ruleset bypass, or a staging-branch-and-poll dance** — the first weakens a
  protection on a public repo to buy a convenience; the second works and is
  machinery a later reader has to reverse-engineer. The owner stopped both.

A PR needs neither: it is how required checks were designed to be satisfied, and
`--auto` means nobody waits on it.

**Two things I got wrong on the way, recorded because the reasoning was the
problem, not the typing.** I predicted a bot-created PR would not trigger
workflows at all (the GITHUB_TOKEN recursion rule) — it does; they ran. And
having predicted that, I nearly designed around a constraint that did not exist.
The actual constraint was different and only visible by running it: the runs
arrive as `action_required`, because a PR from `github-actions[bot]` counts as an
*external contributor* and this repo requires approval for those. Both facts came
from executing the thing, and neither would have come from thinking harder.

**Two repo settings changed, both disclosed:** `allow_auto_merge` on (weakens
nothing — every merge still passes the same four checks) and
`can_approve_pull_request_reviews` on (Actions cannot open a PR without it).
A third setting — `approval_policy` — was deliberately NOT touched: loosening it
would let any stranger's PR on a public repo run workflows unreviewed, which is
a permanent, repo-wide cost for one weekly convenience. The narrow fix is an
`FX_TOKEN` secret the owner mints; the workflow already prefers it and falls back
without it, so adding the secret is the entire remaining change.

