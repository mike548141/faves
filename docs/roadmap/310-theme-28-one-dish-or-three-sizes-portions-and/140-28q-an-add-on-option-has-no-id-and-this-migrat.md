- [ ] **28q — An add-on option has no id, and this migration is what makes
      that expensive** `[M][schema]` — found while decomposing `490/050`;
      independently real, and independently deliverable.

  🔎 **The defect.** An order line's identity is
  `` `${i.venueId}\n${dishId(i)}\n${selectionKey(i.options)}\n${note}` ``
  (`site/js/cart.js:68-69`), and `selectionKey`
  (`site/js/addons.js:238-243`) is:

  ```js
  (selection || []).map((s) => `${s.group}${s.name}`).sort().join("")
  ```

  An option is identified by its group id concatenated with its **display
  name**. Options carry no id — `validate.py:2066-2074` gates group ids in both
  directions, but an option has only `name`, `price` and `tags` (200 options
  across 50 groups today).

  🚩 **Two consequences, and the second is new.**
  1. **A rename re-keys every stored line.** "Large" → "Lg" and every saved
     order line, every backup and every outstanding share link points at a line
     that no longer merges. This is precisely the failure ADR 0051 fixed for
     dishes and left open for options — read `site/js/dish-id.js`'s header,
     which lists the five jobs a name was doing and says *"and this one costs
     money"* about the order line.
  2. **There is no delimiter.** `{group:"a", name:"bc"}` and
     `{group:"ab", name:"c"}` produce the same key. Harmless today by luck;
     `28k`'s group ids will be short and systematic (`size`, `protein`), which
     is the shape that makes a collision plausible.

  **Why it matters more after `490/050`.** Today an option is an *extra* — a
  mis-keyed sauce is an annoyance. After the ruling an option is a **size or a
  protein**, so a mis-keyed option is the difference between a $14.50 plate and
  a $29.00 one, and between chicken and falafel.

  🛑 **Fixing it is not free and the constraint is named in the code.**
  `CODEC_VERSION` in `site/js/share-codec.js` is compared with a strict `!==`
  and *"must not be bumped"* (`:139-141`) — its whole positional-slot design
  exists to avoid it. So an option id has to arrive the way the dish id did:
  optional in the wire format, resolved with a fallback to the name, never a
  hard cutover.

  📋 **Options.** (1) Give an option an `id`, default `slug(name)`, and key on
  it with a name fallback — mirrors ADR 0051 exactly, and its migration story
  is already written and proven. (2) Add a delimiter to `selectionKey` only —
  fixes consequence 2, not 1, and still re-keys every stored line once.
  (3) Do nothing and forbid renaming an option — unenforceable, and a venue
  renames what it likes.

  ✅ **What proves it landed.** A unit test that two different (group, option)
  pairs cannot produce one key; a test that renaming an option's display name
  leaves `lineKey` unchanged; and an `addon_check.mjs` assertion that a line
  stored before the change still merges after it.

  **Depends on:** nothing. **Should land before** `28m` if `selects` is going
  to carry money.
