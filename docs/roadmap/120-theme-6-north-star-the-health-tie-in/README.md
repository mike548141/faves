# Theme 6 — North star: the health tie-in

Treat this as a **separate, private, personal app that *consumes* Faves**
— not a feature bolted into Faves. Why the split is the right
architecture:

- Faves is public, account-free, and forbids personal/health data in the
  repo. An eating diary + exercise log is inherently personal, private
  and persistent — the opposite shape. Mixing them would drag exactly the
  data this repo bans into a public artefact.
- Clean seam: Faves *publishes* structured dish data (portions, tags,
  nutrition where known); a downstream personal app *logs* what was eaten
  against it. **The order tally (Theme 1) is the natural bridge** — an
  order history is the seed of an eating diary.
- Keep the boundary absolute: nothing personal enters this repo. The
  health app is its own project (local-first, private store) that reads
  Faves' JSON.

This stays a *direction*, not a phase — but Themes 1 and 5 are the hooks
that make it possible later, so building them "leaning the right way"
costs nothing now.

🎯 **Widened by the owner, 2026-09-29** —
[`010`](010-nutrition-for-every-dish-recipe-and-serving.md). Faves itself is to
*provide* nutrition (energy, macros, cholesterol, micronutrients, "anything else
available") for dishes, recipes and servings, eating out and cooking at home.
The result is ideally pushed to Apple Health, but it may instead be stored in
Faves, in the user's own device-local data set. That reopens the "separate app"
line above: it is now one of two options he has named, not the plan.
