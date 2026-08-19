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
      📌 **Questions 2 and 3 used to live here and have moved** to
      `100-owner-calls-the-menu-fetch-left-owing.md`, the 🎯 item that
      announces them. They arrived here as numbered leftovers of the
      pre-split single list, so the item flagged as the owner's ask held one
      of the three questions it named and a reader could not see the other
      two. Moved 2026-08-19; nothing was reworded.
