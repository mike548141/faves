- [ ] **36a — what the data says about time, and what it doesn't** `[S][data]` 🎯

> 🎯 **Owner ruling 2026-08-16, relayed from a peer session:** *estimate the
> per-step and total times, and label them as estimates.* Same ruling for 36c.
> This **reverses** the position the rest of this item argues for, and it is his
> call to make. ✅ **The derivation is DONE 2026-08-16** — `data/estimates/`
> (the repo-only research store), all 24 recipes and 118 steps, every number
> carrying its **working**, guarded by `tools/recipe_estimates.py --check`
> and recorded as [ADR 0064]. It landed in the record first, not the payload,
> so the numbers are auditable before any of them reach a phone.
> 🎯 **A safety line was raised here and the owner OVERRULED it the same day —
> [ADR 0066] supersedes [ADR 0064]'s decision 2.** This build first held that an
> *estimated* duration must never drive a **timer**, on the grounds that an
> invented "simmer 20 min" on chicken is a food-safety failure rather than a
> disappointing dinner. That argument, and a middle option splitting on `phase`
> rather than on source, were both put to him. His ruling, verbatim:
> *"Estimates drive timers too, clearly marked — every step gets a countdown;
> estimated ones are labelled as estimates on the timer face."*
> So **`timerSafe` is retired, not inverted** — under the ruling every duration
> is timer-eligible, making the flag `true` everywhere and therefore
> information-free. `source` (`stated`/`estimated`) is what the timer face
> reads. **The gate was replaced, not dropped:** a step carrying `minutes` with
> **no `source`** now exits 1, because that is a countdown with no way to know
> whether to mark it. Proved by deleting a `source`: `🛑 SAFETY: … has minutes 5
> but source None … its countdown would run with no way to mark it an estimate`.
> ⚑ **"Clearly marked" means on the timer face itself** — `12:00 (estimate)` as
> real text, not a colour and not the step text alone. A countdown that looks
> identical whether the number was read or guessed is not marked.
> 🔑 **Worth keeping as method, not as grievance:** raising the concern *before*
> building to it was right, and so was complying the moment it was ruled. What
> made the reversal cheap was landing in `data/` rather than `site/` — no phone
> ever held the retired rule.
>
> 🔎 **The corpus is better than this item said: 32 steps state their time,
> not 28.** The extra four state it in *words* — "cook the garlic for a
> minute" (×3) and "marinate for at least an hour". 28 is the **digits-only**
> count, which is exactly what `cook.js`'s regex can see. Calling those four
> "estimates" would have mislabelled the data to match a tool's limitation.
>
> ✅ **Both ANSWERED by the owner, 2026-08-16 — and the weak-estimate question
> with them:**
> - **`serves` vs yield → SHOW BOTH, LABELLED** (e.g. *"Makes 12 waffles ·
>   serves 4"*). The record already keeps them apart, so this is a render job,
>   not a data one. `[S][ux]` and now unblocked.
> - **The nine weak estimates → SHIP AS THEY ARE.** He declined to supply his
>   own numbers, and the reasoning holds: every one is labelled an estimate and
>   carries its **working** in prose, so nothing is presented as fact. Do NOT
>   re-open this by asking him per recipe. The weak ones stay weaker, visibly.
> - **The five bake-only `time` values remain open** — see the question below.
>
> 🚩 **Two findings that need an owner call, neither resolved here:**
> - **`serves` and yield are conflated in the payload today.** Liège Waffles'
>   `serves: 12` is 12 *waffles*; the puddings' `serves: 6` is 6 *people*;
>   "makes 21" is 21 queen cakes. The record now keeps `yield` separately
>   rather than silently picking one — which the app shows is his call.
> - **Five stated `time` values are bake-only** (Orange Yoghurt Cake, Queen
>   Cakes, Chocolate Self-Saucing, B's Brownie, Chewy Cookies) and exclude
>   6–15 min of prep, yet the app renders `time` as if it were the total.

[ADR 0064]: decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md
[ADR 0066]: decisions/0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md

The owner asked for *"an estimate of time required for each step and each recipe
as a total"*. Measured across the corpus, 2026-08-16:

| | have it | missing |
|---|---|---|
| Steps stating their own duration | **28 of 118** (24%) | 90 |
| Recipes with a `time` total | **9 of 24** | 15 |
| Recipes with a `serves` count | **3 of 24** (Liège Waffles 12, Chocolate Self-Saucing Pudding 6, Tiramisu 6) | **21** |

The 28 stated step times now drive the timers, and they are read from the text,
never guessed. The other 90 steps have **no source**: how long "beat together
the sugar and butter" takes is not in the data, not on the page, and not
something this repo may invent — a wrong time on a cake is a burnt cake.

⚠️ **And the sum of stated steps is not a total.** Chocolate Self-Saucing
Pudding's steps state 35 minutes; its `time` is "~35 min" — but Perfectly Pretty
Hotcakes states 5 minutes across its steps against a `time` of "~50 min",
because prep is untimed. Publishing sum-of-steps as a recipe total would
understate most recipes by most of their length.

🎯 **For the owner — this one only you can close.** Per-step times and the 15
missing totals need to come from you (or from cooking them). Say the word and
the field goes in the schema and the screens read it; what will not happen is a
number being invented to fill a column.
