- [~] 🔎 **The allergen sweep has no rule for seven everyday food words, and
      one rule it does have misses the plural** `[S][tools][data]` — found
      2026-09-07 (session faves-b1) while transcribing five menus for `080/190`,
      and **checked against the tool as it stands after the `contains-fish`
      merge**, not against a remembered version.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — delivered by a
  sub-agent in its own worktree (`faves-o1-allergen-words`, branch
  `allergen-words`), landing by PR so CI runs before the merge.

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
