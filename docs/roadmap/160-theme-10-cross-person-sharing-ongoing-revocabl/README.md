# Theme 10 — Cross-person sharing (ongoing, revocable) — owner-gated

Considered 2026-07-23, **not yet decided**. Distinct from Theme 9 (a
person's *own* devices) and from the one-shot group-order links (ADR 0009,
a snapshot). Builds on Theme 9's E2E store; **needs its own ADR when built.**

The capability: person A grants person B **ongoing, read-only, revocable**
access to a **scoped slice** of their personal layer — e.g. Alex shares their
favourites so the orderer can pick their usual when ordering for the family.

- **Scenario 1 (send picks to the family order) does *not* need this** —
  owner agreed 2026-07-23: ADR 0009's link already does the async "send my
  picks" job; live simultaneous *rooms* are a separate later polish, not a
  reason to build sharing. Don't build the backend for Scenario 1.
- **Why the backend earns its keep here (Scenario 2):** a v1 shareable-link
  of favourites is a **snapshot that goes stale**; "ongoing/live" forces the
  backend + a **pull** model. Additive — ADR 0009's link stays the
  zero-account floor.
- **Opt-in, per-scope** (owner steer 2026-07-23): the sharer chooses *what*
  they expose — **separate toggles for favourites / dietary needs /
  allergens**, not all-or-nothing. **Default shared scope = favourites**
  (owner-decided 2026-07-23); dietary + allergens are opt-in additions, off
  by default. Read-only for the recipient; one-way (mutual = two grants);
  revoke must be easy and obvious.
- **Crypto step-up — E2E sharing is key-sharing.** The server can't "grant
  access" (it can't decrypt). Each user needs a **keypair**; the sharer wraps
  a copy of their data-key to the recipient's public key (envelope
  encryption). **Revocation is forward-only** — the recipient may have cached
  what they already saw; state that limit to users. → **Lean Theme 9 the
  right way: give each user a keypair from the start**, even though self-sync
  only needs the symmetric secret, so sharing is a smaller later step.
- ✅ **RULED 2026-08-16 — a shared list is LIVE, and staleness is not our
  problem to solve.** Owner, verbatim: *"It will never stale because the point
  is that it will stay in sync. We are not going to try and address the issue
  of someone not updating their own allergens. So if I share my allergen
  settings with someone then they will get the latest data that I configure in
  faves and as it changes."*
  🚩 **This is a bigger ruling than it reads.** It changes Theme 10 from a
  **one-way snapshot grant** to a **live subscription**, which means sharing
  cannot ship before **Theme 9 v2's backend** — a snapshot needs no server, a
  live feed does. It also draws the responsibility line: Faves guarantees the
  recipient sees *what the sharer currently has configured*, and does **not**
  attempt to police whether the sharer keeps their own allergens current. So the
  copy must say whose configuration it is and when it last synced, not "this is
  safe". Re-scope 10 against 9 v2 before building any of it.
  ⚑ ~~**Allergen-safety framing is load-bearing.**~~ (Superseded by the ruling
  above; the reasoning is kept because the *class* of risk is unchanged.) Shared dietary/allergen
  data is health-adjacent; ordering off a **stale or wrong** shared list is a
  **safety** failure, not cosmetic. Frame as **"informational — confirm with
  the person,"** never authoritative; inherit the app's existing allergen
  safety framing. Given real household allergies, non-negotiable.
- ✅ **Owner calls — resolved 2026-07-23** (both, so this is direction-set,
  not open):
  1. **Share health-adjacent data across people? Yes** — but **only on
     explicit opt-in consent** from the sharer, per scope. So dietary/allergen
     sharing lives in Faves (not deferred to the Theme 6 health app), gated on
     consent + the load-bearing safety framing above.
  2. **Default scope = favourites** (dietary + allergens opt-in, off by
     default) — see the scope bullet.
  Still needs its own ADR when built (crypto model, consent UX, revocation).
- **Theme 11 extends this model** (2026-07-29): sharing *recipes* needs
  **per-item** grants rather than per-scope, and a family shared set would be
  **multi-writer** — neither is covered by the read-only design above.
