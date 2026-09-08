- [ ] 🎯 **Cook at Home should use the venue/branch structure, so two houses are
      two branches** `[M][schema][design]` — **owner-raised 2026-09-08**, his
      words: *"cook at home should use our restaurant / branch data structure so
      if I have two houses I can differentiate between houses"*.

  **Why it fits, and it fits better than it looks.** `cook-at-home.json` is
  already a venue record — `kind: "recipes"`, `area: "Home"`, `city: null`,
  `address: null`, five recipes in `menu`. It is a venue with no location, sitting
  in a model where **12 venues already carry `locations[]`** and a branch already
  holds `label`, `address`, `lat`, `lng`, `phone`, `hours`, `timezone` and its own
  provenance pair. Two houses is exactly the shape a chain already has, and
  everything downstream — the branch picker (ADR 0054), per-branch hours, the
  nearest-branch reads, distance sorting — would work on day one. Nothing new is
  invented; an existing mechanism is pointed at a second subject.

  🔑 **And it answers a question the model has not been asked yet: which kitchen
  am I standing in?** A recipe is the same in both houses, but the *equipment*,
  the oven, the pantry and the shops nearby are not. `490/080` (household stock)
  is parked on a boundary decision, and this is the identity that decision would
  need — you cannot say what is in the fridge until you can say **which fridge**.

  🛑 **THE HARD RULE IT COLLIDES WITH, STATED BEFORE ANY BUILD.** CLAUDE.md:
  *"No home addresses of people, no health details, anywhere — those two are
  absolute."* And `validate.py:1509-1511` **requires** a branch's `address`
  to be a non-empty string. So a house-as-branch, built the way every existing branch
  is built, would put the owner's home address in `site/data/` and precache it
  onto every phone that installs the app. **The public repo makes it worse:** the
  payload is served, and git history is public, so a house address committed once
  is disclosed permanently.
  🔑 This is not a reason to refuse the idea — it is the design constraint the
  idea has to be built around, and it is solvable. But it must be settled
  **before** a branch is written, not after.

  📋 **Options, with what each costs.**
  1. **Named houses, no addresses.** A branch may omit `address` when the venue's
     `kind` is `recipes` — `label: "the city house"` / `"the bach"`
     and nothing else. `validate.py` relaxes the address requirement for
     that kind only, and
     **refuses `address`/`lat`/`lng` outright there**, so the rule is enforced by
     the validator rather than by care (the shape ADR 0090 rule 1 already uses).
     ✅ Keeps the absolute rule absolute. ❌ No distance sorting or "which house
     am I at" detection — the reader picks, the app never knows.
  2. **Houses live on the device, not in the payload.** The house list is
     personal data in `localStorage` beside profiles, exported and synced like
     everything else, and the shipped record stays as it is. ✅ An address never
     enters the repo at all, and the app *can* know which house you are at,
     because the coordinate is on your phone. ❌ A new personal store to add to
     the whitelist walk (`personal-data.js`, `profiles.js`) — the class that has
     already leaked twice — and the recipes and the houses then live in two
     different places.
  3. **Both**: the branch shape in the payload carries the label, the device
     carries the location. ✅ Renders like a chain, knows where you are, discloses
     nothing. ❌ The most moving parts, and a join between a shipped record and a
     personal store that nothing else in the app does.

  🎯 **Recommendation: (1) first — it is small, it is enforced, and it delivers
  the thing he asked for (telling the houses apart).** (2) is the right answer to
  the *different* question of the app knowing which house you are in, and it
  should be bought when a feature needs it rather than up front.
  🚩 **Two things that are the owner's alone**: whether a house's *label* may name
  a place at all — a town name is not an address, but with one venue's worth of
  context it narrows to a town, and the floor's own `leakscan` blocked the first
  draft of this item for naming one — and whether Cook at Home stays one venue
  with branches or becomes one venue per house.
  🔗 Bears on `490/080` (household stock) — that decision needs this identity —
  and on `490/060` (a branch has no id), which becomes a precondition the moment
  a second branch exists here.
