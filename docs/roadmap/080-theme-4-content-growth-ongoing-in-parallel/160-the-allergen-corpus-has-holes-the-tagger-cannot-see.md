- [ ] 🚩 **The allergen corpus has holes the tagger cannot see** `[M][data]`
      — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). Not a tagging *policy* question; the tagger is matching
      words the menu does not use:
      **BurgerFuel: 13 burgers carry no `contains-gluten`** while their
      "lightweight" twins do — `tag_allergens.py`'s `\bbuns?\b` cannot match
      *"Cheeseburger"*. **McDonald's: 31 of 41 items carry no `contains-*` at
      all.** **21 twin-allergen warnings** are unresolved across the corpus.
      ⇒ These are the dishes a reader with an allergy is most likely to meet,
      and the gap reads on screen as "no allergens" rather than as "not
      checked".
      **Two adjacent data faults from the same sweep:** McDonald's **41 null
      prices carry no `needs: price`**, so `needs.py` cannot see them and they
      are invisible to the worklist; and **`revisions` ships in the precached
      payload while no screen reads it** — an ADR 0047 breach, cost paid by
      every phone.
