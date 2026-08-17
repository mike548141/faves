- [ ] **Ranking and "Open now" ignore lifecycle closure** `[XS][js]` —
      found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). `rankVenues` and the "Open now" filter both read opening
      hours and neither reads whether the venue has *closed down*. The card
      badges it and the dice already refuses to pick it, so three surfaces
      disagree about the same venue. **Latent today — the corpus holds no
      closed venue** — which is exactly why it is worth fixing before one
      arrives rather than after somebody is sent to a shut shop.
