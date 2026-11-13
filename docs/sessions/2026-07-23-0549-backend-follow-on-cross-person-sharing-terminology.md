- **2026-07-23 (backend follow-on: cross-person sharing + terminology)**: Owner
  weighed what a backend unlocks for third-party sharing. Rulings: (1) **Scenario
  1** (send picks to a family order) does **not** justify a backend — ADR 0009's
  link already does the async job; live rooms are a later polish. (2) **Scenario
  2** (ongoing, revocable sharing of a scoped slice of someone's personal layer)
  **is** the real payoff — recorded as new **ROADMAP Theme 10**, owner-gated, its
  own ADR when built. Owner steers captured: sharing is **opt-in per-scope**
  (favourites / dietary / allergens as separate toggles); **allergen-safety
  framing is load-bearing** (informational, confirm with the person — health
  data, safety not cosmetic); two ⚑ owner calls stand (share health-adjacent data
  at all vs push to the Theme 6 health app; default scope). Crypto note: E2E
  sharing = key-sharing (per-user keypair + envelope wrap; revocation
  forward-only) → **Theme 9 should carry a keypair from the start** so sharing is
  a smaller step. (3) Terminology fix (owner): once passkeys ship, **stop saying
  "no accounts"** — a passkey reads as an account; state what's not collected
  instead → **ADR 0017 Addendum 2**, with a lockstep to revisit the About line
  (`about-ui.js`) when passkey sync lands. Records: ADR 0017 Addendum 2,
  decisions README, ROADMAP Themes 9 (terminology bullet) + 10. Docs-only.

