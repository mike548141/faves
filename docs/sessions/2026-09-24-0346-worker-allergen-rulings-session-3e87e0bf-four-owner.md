## 2026-09-24-0346 — worker `allergen-rulings` (session `3e87e0bf`): four owner rulings executed, and the class table gets its first test

Branch `allergen-rulings`, worktree `/Users/mike/worktrees/faves-allergen-rulings`.
Executed the four rulings the owner gave on 2026-09-21 against roadmap
[`470/030`](../roadmap/470-theme-37-cook-mode-and-the-recipe-page-as-the/030-37n-the-corpus-disagrees-with-itself-about-all.md).
The item and [ADR 0122](../decisions/0122-declining-to-infer-is-not-asserting-an-absence.md)
carry the full account; this entry keeps only what a later session needs.

**`tools/allergen_disagreements.py`: 3 class/allergen splits over 44 rows →
1 over 1.** `turkish-pizza` splits out of `pizza` keeping gluten and dropping
dairy (−6); `crumbed` stops watching `contains-egg` (−36); `italian sausage`
leaves the wheat-rusk class (−2). 🛑 **No dish's tags changed in either
direction** — `site/data/` byte-identical, `tag_allergens.py` dry run proposes
0, and a test case fingerprints `site/data/` around three report runs. Nothing
under `site/` changed, so **no version constant was owed** and
`check_versions.py --range` says so.

🔎 **The one row left reporting is `abrakebabra/pizza-slice`, and it is a
decision not an oversight.** A $4 *"Pizza Slice / Chicken."* in **Sides**, at a
shop whose only pizza is Turkish — but it prints nothing saying which pizza it
is cut from, and there is no intake material for the venue. The two ways to
silence it are hard-coding a venue into a corpus-wide table of food claims, or
reading the section heading, which is `470/060`'s open question. So `--strict`
is **still not reachable**; wiring it needs its own item.

✅ **`tools/test_allergen_disagreements.py` — the class table's first test**,
14 cases + 6 break-probes, wired into CI and the verify list by hand. The
harness asserts each breaker's covered cases fail **and that no other one
does**. 🔑 **Two breakers are about the MECHANISM, not the outcome**: the
`exclude` veto and the lookbehind print an **identical** report on today's
corpus, so no outcome test can tell them apart. `b3` and `b6` rebuild each
narrowing as the veto and require exactly one synthetic line to notice —
*"pork sausages, italian sausage"* and *"Turkish pizza, or a Margherita
pizza"*. Both fail alone, with their own assertion text.

🚩 **Reported, not fixed:** the four `exclude` entries already in the `sausage`
class (chorizo · salami · pepperoni · kransky · lap cheong) are vetoes of the
shape ruling 3 declines. Measured — the twelve rows they catch are all sausage
rolls, Chinese-sausage dishes or pizzas with no rusk-bound sausage, so nothing
is wrong today, but a plate naming a chorizo beside a plain sausage would leave
the class. Outside the four rulings.

🔑 **`470/060` is NOT affected**: re-measured on this worktree, still 230 items
under those headings, 162 tagged, **68 not**, same five venues. Bambina's
`italian-sausage-hot-honey` carries no tags at all and is one of the 68 —
leaving the *sausage* class did not silence it, because the *pizza* class never
held it either (nothing reads a section's name).

⚠️ **`allergen_disagreements.py` prints NO tree line.** It is not on the verify
list, not in CI, and not one of `lib/tree.py`'s 26 entry points, so its output
cannot be attributed to a tree by an orchestrator reading pasted output. The
new test file does print one. Not changed here — it is a gate-wiring question,
not one of the four rulings.

