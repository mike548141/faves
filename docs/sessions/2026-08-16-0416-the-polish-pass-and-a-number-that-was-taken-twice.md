## 2026-08-16 04:16 UTC — the polish pass, and a number that was taken twice

**Ask.** The owner kept browsing and raising items; each was triaged on his
standing rule — deliver it, or queue it if it wants a session of its own. A
parallel session ran throughout, landing FX/localisation and facet links.

**Delivered.** The report ⚑ on a dish row was invisible, and the cause was
worth naming: it rendered at 55% of the ♥ beside it, dimmed to 0.75, in a
smaller box — **three reductions stacked on one control**, each defensible
alone. It now matches the ♥'s family (86%, since a solid ⚑ reads heavier than
an outline ♡) at full strength in a matching 52 px box, and is recessive by
**colour alone**. That shape — de-emphasis applied on several axes at once —
is the same one that made the allergen ⓘ hard to see earlier, and belongs in
Theme 23b's guide as a rule: pick one axis to recede on.

The hours badge stopped repeating itself. It renders `label · detail`, and both
"soon" states had a detail restating the label: "Opens soon · opens in 14 min".
Both now carry one phrase — "Opens in 14 min", "Closes in 12 min" — with the
amber dot carrying "soon". Further out the halves genuinely differ, so "Closed ·
opens Tue 11am" is untouched. All five phrasings were checked against real
hours, not just the two that changed.

The update prompt took the owner's own wording: *"Get it while it's hot! Update
for the latest menus and prices."*

**The cuisine gap, and why the answer is nothing.** Searching "mexican" returns
nothing. Before proposing any venue, every menu was audited against
cuisine-signature dishes in case a cuisine we already serve was merely untagged.
Seven venues matched and **all but one are a single dish** — "Korean-Fried
Cauliflower" at three separate gastropubs, one "Korean Style Chilli Beef" in KC
Cafe's 169. Tagging any of them Korean would be false and would make search
worse. So the gap needed venues, not tags — and the owner ruled **leave it**:
coverage is not a goal, a cuisine arrives when a place he likes arrives. Written
into Theme 24 as prose rather than a `[x]` item, deliberately: the cold-content
gate would have harvested a completed checkbox to `ROADMAP-DONE.md`, and the
whole value of the entry is the next session reading *do not re-propose this* in
the live roadmap. `leakscan` blocked the first attempt — a candidate street name
contained a private estate term, on a public repo. The guard earned its keep;
the names came out.

**ADR 0045 existed twice.** The FX branch merged minutes after this one and both
took 0045. Both sessions allocated at merge as the rule requires, and both found
it free when they checked — two long-lived branches, not a broken rule. Ruled by
the owner: this record moves to **0047**, because the FX decision is a shipped
feature carrying its number in nine `site/js` comments. Eleven references updated
in one commit; every reference the FX record owns re-checked afterwards and left
alone. The record now states on its face that it was renumbered, because a dozen
of today's commit messages call it "ADR 0045" and git history cannot be edited —
without the note, someone following one of those messages lands on the currency
decision. The contrast with `0025` is recorded with it: same rule, opposite
answer, because the rule is about **cost**. 0025 was found weeks late with 24
inbound references; this was found within the hour and cost eleven.

**Verification.** `node --test` **655**; `validate.py` 48 files clean;
`device_check` 19/19; `cook_check` 36/36; `registry` and `split_data --check`
clean; plus live runs in headless Chrome at 390 px for the ⚑ geometry (5/5) and
the card layout (8/8). `SHELL_VERSION` → 2026-08-16.13.

**A harness lesson, repeated often enough to write down.** Purpose-built live
checks produced false failures three times before producing true ones: one timed
an interval from page load, and two waited on `li.card` — which the **no-JS
fallback `<ul>` already satisfies**, so they measured the static mirror rather
than the rendered page. On a fail-soft site, wait for a JS-only signal
(`body.app-ready`, an unhidden control), never for markup the fallback provides.
