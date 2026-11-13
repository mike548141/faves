## 2026-09-20-1239 — worker `floor-restamp` (session `3e87e0bf`): the floor becomes a real copy, and the tool that was supposed to watch it cannot

Roadmap `340/060`, on the owner's 2026-09-21 ruling. `CLAUDE.md`'s doctrine
block was an enriched, compressed restatement of atelier's canonical `floor`
region carrying two forks he ratified on 2026-08-17. atelier's `115/030`
(2026-09-19) made that unlawful — *floor copy verbatim, and `narrow=` on a
`region=floor` stamp reds*. Ruled: **re-stamp verbatim, relocate every
enrichment into the onramp beneath, lose nothing.** Done, with
[ADR 0120](../decisions/0120-the-inlined-floor-is-a-verbatim-stamp-and-our-enrichments-live-beneath-it.md).
Pin `eb6449d` → `09cd4d2`.

### The block is constructed, not transcribed

The region was extracted between atelier's `floor:begin`/`floor:end` markers by
script, its presentation fence stripped, and its four placeholders filled by
script. That is the difference between *"verbatim"* as a property of the build
and *"verbatim"* as a claim about how carefully somebody typed. The finished
block differs from canonical on exactly six lines, all six placeholder-bearing.

🚩 **The heading carries no date.** Ours said *"pinned `atelier@eb6449d`,
owner-ratified 2026-07-25, bumped 2026-09-09"*; canonical is the pin and
nothing else, and an addition reds exactly like a reword. The dates moved to
the ADR and to here.

### 🛑 The claim that `stampscan` could finally watch it was WRONG

Three measurements, all from the tool:

1. `stampscan --root <worktree> CLAUDE.md` → `[missing-source] … does not
   resolve: docs/method/PROPAGATION.md`, **exit 2**. atelier's **ST3**, still <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
   open — confirmed in `resolve_source()`, in the module docstring, and in
   atelier's board (`320/160` and `020/110`, both `- [ ]`).
2. **ST3 is not the binding obstacle.** With the canonical file staged beside a
   copy of `CLAUDE.md` so `source=` resolves: **exit 1, drift**, first offender
   the *filled pin*. Every child must fill four placeholders, substitution
   rewords, and the tool reds on anything not obtainable by pure deletion. **A
   compliant child reds by construction.**
3. `stampscan` with no path argument scans `<root>/docs` — so a child's stamped
   floor at the repo root is invisible and it prints *"clean — no stamped
   blocks found"*, **exit 0**. The likeliest invocation is the blind one.

🔑 **So the hand check is not a stopgap; it is the only instrument that can
pass a compliant child.** It now lives in the onramp with its command and runs
every pin bump. Against `937eea6`: zero drift outside the six placeholder
lines, zero residual placeholders, no line at or over 86 columns.

🚩 **Owed upstream as a CORROBORATION of atelier `320/160`, not a new item** —
two private children filed it already (2026-09-06, 2026-09-20). This is the
third and the first public one; it adds the default-scope blind spot, and the
observation that the two obstacles have different owners (ST3 is a tool fix;
the placeholder problem is a doctrine question about what a stamped copy means
when the house instructs the child to reword four of its lines).

### What I would push back on, having done it

The canonical text is **worse than ours in one place and I am saying so rather
than swallowing it**: the apex bullet's *ordering rationale* ("adaptation runs
on evidence, and honesty is what makes the evidence trustworthy") is a reason,
and the three `00-APEX` practice clauses it displaced were *instructions* — the
thing a session can act on at 3am. Both now exist here, the rationale in the
stamp and the clauses beneath it, so nothing is lost locally. But every other
child that re-stamps loses the clauses, and that is worth a line upstream.

### Verified

`floor.py --plane hook` exit 0 — every enforced check green (`wrapscan` clean at
85 columns, `board` index current, `datescan`, `spellscan`, `licenscan`,
`secretscan`, `leakscan`, `linkscan`, `publishscan`, `sizescan`, `reviewscan`,
`conflictscan`); `pathscan` warn-only and back to its 4 pre-existing findings.
`check_decisions.py` clean, 119 records. No `site/` file was touched, so no
version constant moved and no browser check was in scope. **`board.py rebuild`
was deliberately NOT run** — two sibling workers were live and it reads the
worktree; the orchestrator rebuilds at merge.

⚠️ **One command was blocked and I did not route around it.** A compound
staging command carrying `rm -rf` into the scratchpad was denied; I rebuilt the
staging directory under a fresh name and deleted nothing. Disclosed in the turn
it happened, per the 2026-08-17 ruling.

### 🛑 An ADR number collision, caught by the post-push check and not before

I checked the allocator before writing — `0118` was the highest on `main`, on
every pushed branch and in every sibling worktree — took `0119`, committed,
pushed, and **then** ran `check_decisions.py` and re-listed the remotes, which
is the order `docs/decisions/README.md` insists on. A sibling worker had pushed
its own `0119` **56 seconds earlier**. Neither of us could have seen the other
at the moment we chose; the collision is visible only from the outside, which
is exactly what that README's 2026-08-16 write-up says.

Repaired by the house rule — **move whichever record has FEWER inbound
references, not whichever landed second.** Theirs carried 7, mine 5, so mine
moved to **`0120`** and all five inbound references went with it (CLAUDE.md's
onramp, this record, the roadmap item twice, the index). Theirs is untouched.
Both criteria happened to agree here, which is luck: the rule is cheapest
repair, and it would have moved theirs had the counts run the other way.

