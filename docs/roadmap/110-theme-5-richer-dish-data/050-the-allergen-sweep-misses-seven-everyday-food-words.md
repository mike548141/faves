- [x] 🔎 **The allergen sweep has no rule for seven everyday food words, and
      one rule it does have misses the plural** `[S][tools][data]` — found
      2026-09-07 (session faves-b1) while transcribing five menus for `080/190`,
      and **checked against the tool as it stands after the `contains-fish`
      merge**, not against a remembered version.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — option 1, in worktree
  `/Users/mike/worktrees/faves-o1-allergen-words`, branch `allergen-words`.
  The item's own warning was taken literally: **the probe was re-run against
  the tool, not read off the table above.**

  **The probe, re-run (a).** The table said "none of these strings appears in
  the rule file". Two corrections, both from asking the *rules* rather than
  the file: `sourdough` **is** in `tools/tag_allergens.py` — inside a comment
  about the hedge guard, reachable by no rule — and the honest question is
  whether any RULE matches, not whether the word is in the file. It does not:

  ```
  == (a) can ANY rule match the word? (rules, not the file's prose) ==
    baguette             -> NO RULE MATCHES
    hoagie roll          -> NO RULE MATCHES
    sando                -> NO RULE MATCHES
    sourdough            -> NO RULE MATCHES
    crouton              -> NO RULE MATCHES
    yorkshire pudding    -> NO RULE MATCHES
    nugget               -> NO RULE MATCHES
    tzatziki             -> NO RULE MATCHES
  ```

  🔎 **The plural diagnosis (b) — neither anchoring nor a token table.** Every
  rule is `\b(alternative|alternative|…)\b`: **one** shared closing word
  boundary, and the only way an alternative matched its own plural was a
  hand-written `s?` on that one word. `toastie` and `sandwich` carry none, so
  the `\b` refuses the plural outright:

  ```
  == (b) the toastie diagnosis ==
    Corn Cheese Toastie      -> Toastie
    Cheesy toasties          -> NO MATCH
    a sandwich               -> sandwich
    two sandwiches           -> NO MATCH
  ```

  So it is not `toastie`'s bug — it is the bug of every word whose author
  forgot the `s?`, and adding `toasties` would have left ~250 alternatives
  with the same hole. **Fixed once**, at the closing boundary, by
  `compile_rule()`, applied to a rule's `exclude` **as well as** its pattern.

  🛑 **The dangerous case, break-probed** (memory: an item-level veto trades
  an over-warning for a miss). Widening the pattern and *not* the exclude is
  not a smaller fix — it is a new false warning on exactly the rows the
  excludes were written for. Measured before the fix was finished:

  ```
  exclude NOT widened: coconut yoghurts     -> ['contains-dairy(yoghurts)']
  exclude NOT widened: ginger beers         -> ['contains-gluten(beers)']
  exclude NOT widened: oat milks            -> ['contains-dairy(milks)']
  ```

  A plant yoghurt warned about dairy is a false warning on the one row a
  dairy-avoiding reader is hunting for. Both halves are now pinned by the
  probe group *"the plural does not widen a rule past its own guard"*, and the
  breaker `the plural widens the pattern but not the exclude` reintroduces
  exactly that and is caught.

  🛑 **The second over-reach, also refused.** The obvious suffix `(?:e?s)?`
  spells `cod` + `es` = **"codes"** — a fish warning built out of a word with
  no food in it. English only takes `-es` after a sibilant, so that is all the
  suffix allows: `(?:s|(?<=[sxz])es|(?<=[cs]h)es)?`. It keeps *sandwiches*,
  *danishes*, *hummuses*; it refuses *codes*, *tartes*, *pitaes*. `-y → -ies`
  cannot be done by a suffix at all, so `pastr(?:y|ies)` spells it out (the
  corpus writes *pastries*).

  **Words added.** `baguette`, `hoagie`, `sourdough`, `crouton` → the STATED
  wheat-product rule; `nugget` → the crumbed-coating rule (the coating is what
  makes it wheat); `sando` → the bakery rule, beside `sandwich`; `tzatziki` →
  a new DERIVED dairy rule (yoghurt dip). **Yorkshire pudding is two rules,
  not one** — gluten and egg, written apart in ADR 0095's shape, and the pair
  independence was probed rather than assumed: deleting the gluten rule leaves
  `['contains-egg']` standing.

  **The sweep — 9 tags, every one `contains-gluten`, every one read.**

  | Venue | Dish | Word that fired |
  |---|---|---|
  | hell-pizza | Splatter Platter 1 | corn **nuggets** |
  | khandallah-trading-company | Classic Caesar | herbed **croutons** |
  | khandallah-trading-company | Eggs Your Way | toasted **sourdough** |
  | khandallah-trading-company | Big Breakfast | **sourdough** |
  | simmer | Chicken **nuggets**, fries | (the name) |
  | sprig-and-fern-tawa | The Fern Breakfast | toasted **sourdough** |
  | sprig-and-fern-tawa | The Vegetarian Breakfast | toasted **sourdough** |
  | takeaway-at-churton | Chicken **Nugget** (each) | (the name) |
  | takeaway-at-churton | Kids Packs | 4 chicken **nuggets** |

  None removed, none left out, no reformatting: the diff is +21/−9 across five
  records and adds nothing but tags. Three rows carry `gf-option`, which
  deliberately does not block — the default preparation is still wheat.

  🔑 **The plural fix adds ZERO tags today, and that is the honest result.** An
  empirical sweep of the whole corpus found the widening newly reaches five
  tokens — `breads`, `cheeses`, `butters`, `squids`, `toasties` — and every row
  carrying one was **already tagged, by hand, by the session that found this**.
  The mechanism buys the next menu, not this one. `baguette`, `hoagie`, `sando`,
  `yorkshire` and `tzatziki` likewise found 0 untagged rows: 28 rows carry them
  and a person had already tagged all 28.

  **`allergen_disagreements.py`: 8 splits before and after; rows lacking a tag
  their class carries 90 → 88.**

  **Also kept in step:** `tools/tag_addon_options.py`'s `ALLERGEN_SWEEP`
  compiles the dish rules through `compile_rule` now, not `re.compile` — the
  drift ADR 0095 §3 measured on the finfish list, one layer down. It adds no
  option tags (0 to add, coverage 105/200 unchanged).

  **Tests.** `test_tag_allergens.py` 38 → **56** cases, all green: 4 new probe
  groups (26 lines of text run through the real rule set in a subprocess, so a
  breaker's rewritten tool is what they read), 1 new real-record case on
  Abrakebabra's *"Cheesy toasties"*, a standing guard that a new rule written
  without a closing `\b` cannot silently opt out of the plural, and **17 new
  breakers** — one per added word, one per Yorkshire twin, and three on the
  mechanism. Every one caught. The guard was probed too: an unterminated rule
  makes it report `[['contains-sesame', '\b(sesame|tahini)']]`.

  **Not fixed here, and not filed** (it is `080/160`'s, already open): the
  leading `\b` means `burgers?` cannot see *"Cheeseburger"*. That is a
  compound-word gap, not a plural one, and this fix does not touch it.

  **What happened.** Five newly-transcribed menus were run through
  `tools/tag_allergens.py`, which applied 132 tags across them. Reading the
  result dish by dish, eight rows that plainly carry an allergen came back
  clean. Each was added by hand and named in the commit that added it, so no
  dish shipped without the warning — but the next menu carrying the same word
  will be silent again, and nobody will be reading it dish by dish.

  🔎 **Two different faults, and separating them matters because the fixes
  differ.**

  **(a) Seven words the tool has never heard of.** Verified by searching the
  rule file itself — none of these strings appears in `tools/tag_allergens.py`
  at all:

  | Word | In a description | Owed |
  |---|---|---|
  | `baguette` | "crusty baguette served with hot beef jus" | gluten |
  | `hoagie roll` | "on a soft hoagie roll" | gluten |
  | `sando` | a steak sandwich, named as a sando | gluten |
  | `sourdough` | "toasted sourdough, candied jalapeños" | gluten |
  | `crouton` | "ranch, pancetta, herb crouton" | gluten |
  | `Yorkshire pudding` | the dish name itself | gluten, egg |
  | `nugget` | "six chicken nuggets, chips" | gluten |
  | `tzatziki` | on 17 rows of one venue | dairy |

  🔑 **`bread` is already a rule and it works** — it is what caught the same
  venue's *"Turkish bread"*. So this is not a missing category, it is a missing
  vocabulary inside a category that exists, which is the cheaper kind of gap to
  close and the easier kind to keep missing.

  **(b) One rule that fires on the singular and not the plural.** `toastie`
  **does** have a rule, and it tagged *"Corn Cheese Toastie"* at one venue on
  the same day. It did **not** tag *"Cheesy toasties"* at another.
  🚩 **Probed, not inferred:** the hand-added tag was removed, the sweep re-run,
  and the tool reported nothing for that dish; the tag was then restored. So the
  matcher is anchored in a way that excludes the plural. That is a different
  defect from a missing word, and a fix that only adds `toasties` to a list
  leaves every other singular rule with the same hole.

  ⚠️ **This is a list, not a diagnosis.** The rule file was **not opened or
  edited** — another session held `tools/tag_allergens.py` on 2026-09-07 while
  landing `contains-fish`, and two sessions editing one rule table is how a rule
  gets silently reverted. Whoever picks this up should re-run the probe rather
  than trust the table above: it is a reading of the tool on one day, against
  five menus, and the same reading against a different corpus would find a
  different list.

  📋 **Options, none taken:**
  1. **Add the seven words** to the existing wheat and dairy rules, and fix the
     plural matching once for every rule rather than word by word. Needs the
     usual breaker case per addition — the suite already works that way.
  2. **Add the words only.** Cheaper and leaves fault (b) live, which will
     produce the same surprise on the next plural.
  3. **Leave it**, and rely on a human reading every new menu dish by dish.
     That is what caught these eight, and it does not scale past a session that
     happens to be transcribing carefully.
  🎯 **Recommendation: option 1**, because (b) is the one that will recur
  invisibly. But note the ceiling honestly — no word list makes the sweep
  complete, and the corpus rule stands: **no tag means "not stated"**, never
  "safe".
