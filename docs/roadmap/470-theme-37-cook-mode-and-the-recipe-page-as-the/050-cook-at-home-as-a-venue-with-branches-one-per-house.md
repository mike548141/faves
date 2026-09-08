- [ ] ✅ **Cook at Home should use the venue/branch structure, so two houses are
      two branches** `[M][schema][design]` — **owner-raised 2026-09-08**, his
      words: *"cook at home should use our restaurant / branch data structure so
      if I have two houses I can differentiate between houses"*.

  ✅ **OWNER RULED 2026-09-08, AND HE EXPANDED THE MODEL RATHER THAN WORKING
  ROUND THE RULE.** His words, quoted whole because the design is in them:

  > *"that expands our data model and features. I am ruling that we can have it
  > in data but here is how it is going to work*
  > *• The current "Cook at home" is the equivalent of a restaurant with a
  > single branch. That branch should match any address or GPS coordinate so
  > that it can be used by anyone i.e. its a public record.*
  > *• We will in the future add private branches to cook at home, private in
  > that they will reside in the users data, not the data held in github and
  > used by all users. Each of those branches for a home will be able to have
  > GPS or a street address the same way a branch of any restaurant branch
  > should be able too.*
  > *• We will allow the user to add more than one "home" or branch to Cook at
  > home e.g. the beach house vs home."*

  🔑 **The first bullet is the part that dissolves the collision, and it is
  better than any of the three options offered.** This session proposed a
  shipped branch with *no* location. He ruled a shipped branch that matches
  **any** location — a wildcard, not an absence. The difference is semantic and
  it earns its keep: *"cooking at home"* is wherever the reader is standing, so
  the public record is **true for every user** rather than blank for all of
  them, and distance sorting can put your own kitchen at zero instead of
  skipping it. No address of any person is in the payload, so CLAUDE.md's
  absolute rule is untouched — it is satisfied by the shape rather than
  negotiated with.
  📎 **Read as an interpretation, not as his words:** that a wildcard branch
  sorts at the reader's own position is this session's reading of *"should
  match any address or GPS coordinate"*. He said what the branch matches; he did
  not say what the home screen does with it. Flagged so the next session checks
  rather than inherits.

  🚩 **Three things this ruling now makes true, which the original filing did
  not anticipate.**
  1. **A branch's address becomes optional in a new, third way.** Today
     `validate.py:1585-1587` requires a non-empty string. The ruled shape needs
     a branch that declares *"anywhere"* — which is a **value**, not a missing
     field, and should be spelled so a reader cannot confuse it with data
     nobody has captured yet.
  2. **A private branch store is now a committed direction**, not an option —
     personal data on the device, exported and synced like the rest. That adds
     a store to the whitelist walk (`personal-data.js`, `profiles.js`), the
     class that has already leaked twice ([ADR 0074], `490/020`). It also has
     to answer whether a private branch's GPS travels in the sync blob, which
     is the exact question `490/020` just settled *against* for the location
     consent flag — a different answer here is defensible and must be
     deliberate.
  3. **`490/060` (a branch has no id) is now a hard precondition**, not a
     recommendation: a user adding branches to a shipped venue needs a stable
     key that a payload refresh cannot renumber.
     ✅ **SATISFIED — checked 2026-09-09.** `490/060` is `- [x]`; ADR 0103
     landed the branch id and `tools/seed_branch_ids.py --check` guards it.
     This precondition no longer blocks anything here.

  📌 **Sequencing, as the ruling implies it:** the wildcard branch on the
  shipped record is small and can land on its own. The private-branch store is
  the larger half and wants its own ADR, because it is the first time this app
  lets a reader *add a record* rather than annotate one.

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
  absolute."* And `validate.py:1585-1587` **requires** a branch's `address`
  to be a non-empty string. So a house-as-branch, built the way every existing branch
  is built, would put the owner's home address in `site/data/` and precache it
  onto every phone that installs the app. **The public repo makes it worse:** the
  payload is served, and git history is public, so a house address committed once
  is disclosed permanently.
  🔑 This is not a reason to refuse the idea — it is the design constraint the
  idea has to be built around, and it is solvable. But it must be settled
  **before** a branch is written, not after.

  📋 **Options as they were offered, kept for the record — the ruling above
  supersedes them, and picked none of the three.**
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

  🎯 **The recommendation was (1) first. He took neither 1 nor 2 nor 3** — he
  kept the public record useful with a wildcard AND committed to the private
  store, which is (2)'s substance without (1)'s blankness.
  ✅ **Both questions this filing put to him are answered by the ruling.** Cook
  at Home stays **one venue with branches**. And a house's label naming a place
  is now moot in the payload — the only labelled houses are private and never
  leave the device. (The floor's `leakscan` blocked this item's first draft for
  naming two real places as example labels, which is the evidence that the
  question was worth asking.)
  🔗 Bears on `490/080` (household stock) — that decision needs this identity —
  and on `490/060` (a branch has no id), which becomes a precondition the moment
  a second branch exists here.

  📝 **BOARD HYGIENE 2026-09-09 — what is left here is BUILD, not a decision.**
  Three corrections, each re-measured rather than inherited:
  - **The headline's 🎯 is retired.** He ruled on 2026-09-08 and the ruling is
    quoted whole above; no ask sits with him on this item. The one 🎯 left in
    the body sits inside the *"kept for the record"* options block and already
    says he took none of the three — it is a superseded recommendation, not a
    live ask.
  - **The `validate.py` citation was wrong in two places and is fixed.** It read
    `1509-1511`; that range is a *comment* about the top-level `address` on a
    multi-branch venue. The rule the text is about — *"address must be a
    non-empty string"* on each branch — is at **`1585-1587`**, inside the
    `for i, b in enumerate(locations)` loop. Verified by reading the file at
    this commit, not by search-and-replace.
  - **The stated precondition `490/060` is DONE**, noted inline above.
  🚩 **Nothing here changes the bracket.** It stays `- [ ]` because real build
  work is owed: the wildcard branch, the private-branch store and its ADR, and
  the validator change that lets a branch declare *"anywhere"* as a value.
