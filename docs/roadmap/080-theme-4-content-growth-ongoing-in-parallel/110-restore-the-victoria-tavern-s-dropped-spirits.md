- [ ] **Restore The Victoria Tavern's dropped spirits** `[S][data]` — the
      direct consequence of the ruling above. Roughly **40 unpriced spirits**
      were dropped from `the-victoria-tavern` during the fetch on the
      now-overruled convention; they are recoverable from the venue's own
      drinks PDF, which the fetch session confirmed is reachable (the HTTP 000
      is a self-signed Plesk placeholder certificate, not a dead domain — its
      mains PDF is dated 2025-11-24). Restore each row with
      `needs: [{what: "price", note: …, since: …}]` and it renders `?` rather
      than vanishing. Run `tag_allergens.py`, `seed_dish_ids.py` and
      `validate.py` after, per the fetch recipe.
      2. ⚠️ **Pizza Hut's prices may not be Johnsonville's.** Its order pages
         quote prices without ever asking for an address, and the store page's
         "View menu" is a Vue handler with no `href`, so the branch flow could
         not be driven. What we hold is **Pizza Hut NZ's default online
         pricing**; whether this branch matches is unestablished. One phone
         call or one in-store look clears it.
      3. ⚑ **Little Sprig Seatoun's menu date is contested**, left at
         **2026-06-29**. The PDF's Canva `/Title` says *"Bar Snacks Menu (Oct
         2025)"* but it was exported 2026-06-29 and the venue's own filename
         calls it the 2026 menu. The export date is the only full-precision
         date the document supports; the conservative read is older. It only
         matters through the staleness caveat — the owner's call whether that
         is worth aging.
