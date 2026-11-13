## 2026-08-17-1620 — addendum: the fourth checkbox state was already ruled, upstream, and I proposed it anyway

**Correcting the entry above.** It records `340/110` — *"the board has no state
for 'decided, and the decision was not to do it'"* — as a finding. **It is not
one, and the item is now closed as answered.**

🛑 **The owner remembered ruling on this and was right.** Put to him at the close,
he said he had described several possible item states weeks earlier and decided
to wait for a clear need — and asked to be shown his own words. A sub-agent swept
**every faves transcript** exhaustively and correctly reported *not found*. That
was true and useless: **the board rules are atelier's**, and nobody searched
atelier. It is in atelier `2cd4730` (2026-07-22, *"tri-state legend, five-state
question captured"*), as his proposal and the builder's counsel:

> **Extend the checkbox grammar to five states?** (Mike, 2026-07-22, mid-build)
> — proposal: add `[-]` declined and `[^]` superseded beside the tri-state.
> **Builder's counsel: keep the tri-state** — the bracket answers the one
> machine-checked question (is work owed?); declined/superseded both answer "no"
> and need a dated note for the *why* regardless, so extra states are a second
> copy of one fact (the point-of-use drift class). **Promote to distinct states
> only if we find ourselves repeatedly grepping dispositions apart** (the
> anti-slop promotion rule). Mike's call; Mike himself flagged the complication
> risk.

🔑 **The real defect was a dropped clause in the copy, not a missing rule.**
Atelier's board README: *"a **work-owed tri-state**, never a disposition (Mike,
2026-07-22): `[ ]` work still owed · `[x]` **no more work owed** — delivered,
superseded, or declined, with the disposition said in the item's own text (a
dated note), **never a fourth bracket**."* faves' legend said only `[x]`
**done**. **A parked item is `[x]`, and always was.** Six items sat mis-marked
because of a missing half-sentence — which is `340/060`'s stamped-copy failure
arriving in a second place, and this time it cost a wrong proposal rather than a
deadlock.

⚠️ **And the re-read shrank my own claim.** *"Six items need a new state"* was
really **three mis-marked, one mis-stated, two correct as they were**: `460/060`
(parked) and `300/010` (ruled not to fix) and `470/020` (superseded) → `[x]`;
`470/010` (37k, *"what remains is OWNER DATA ENTRY"*) → **⏳**, waiting on him,
not declined at all; `370/010` (30g) and `270/020` (Pandan's pin) stay `[ ]`
because work may yet be owed the day a venue or an OSM house number arrives.
Open items 68 → 63.

✅ **What shipped instead of a new state:** the legend now carries the tri-state
rule and its disposition clause, and names the one real residual — 🚩 the index
renders every `[x]` as `✅`, which *reads* as "delivered", so an item closed any
other way must say so in its **first line**, where a reader who followed the tick
lands. That residual is the only thing that could ever meet the 2026-07-22
promotion bar, and it does not meet it yet: it is a rendering problem with a
wording remedy, not a disposition anyone is grepping apart.

🔑 **The transferable rule, and it is the reason this addendum exists rather than
a quiet edit: before proposing a change to an inherited rule, search the repo the
rule comes FROM.** "My exhaustive search of this repo found nothing" reads as
proof of absence and is nothing of the kind when the doctrine is stamped from
somewhere else. And when the owner says *"I think I decided this before"*, that
is a strong prior to go looking on — not something to gently correct.

**Also landed after the entry above:** the owner's CI ruling (`3d0d63e`) —
`split_data --check`, `test_registry`, `test_find_addons` and
`test_tag_allergens` now run in CI; `fetch_fx --check` deliberately excluded,
because `fx.yml` rewrites that file weekly on its own PR and the check would turn
every unrelated PR red the day the source drops a rate. `split_data` gained
`--against REF` first, **because without it the wiring would have been
decorative**: the append-only half compares the working tree to a git ref, and on
a clean CI checkout `HEAD`-versus-`HEAD` can only agree. Proven on the runner,
not asserted — the job log reads *"Comparing history against: cb51817…"* and
*"2 compared against cb51817… for append-only"*. `340/130` queued for the half
that cannot be done from the workflow alone: the job is named *"zero
dependencies"* and runs nine checks, and `protect-main` matches required contexts
**by job name**, so renaming it silently un-requires it until the ruleset is
edited in the same breath.

