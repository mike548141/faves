- **2026-07-12 (Fable: doctrine drift — why a session asked before committing)**:
  Investigated why a live session asked permission to commit despite the
  2026-07-10 standing grant. Root cause: `CONTRIBUTING.md` still said "only
  push when the owner asks" (written 2026-07-08, pre-grant) — the session hit
  a CLAUDE.md-vs-CONTRIBUTING contradiction and correctly stopped, but didn't
  name the conflict in its ask. Fixed the stale line (91a4da5), swept all 14
  estate repos: `rpi` carried the same stale posture (fixed there too);
  everything else consistent. Then, per the owner, moved to inherit-form: the
  grant's canonical record is atelier AUTONOMY's grant-history table; this
  repo's CLAUDE.md/CONTRIBUTING now point at it and keep only the
  push-is-a-deploy delta. Added the ask-names-both-sources rule to atelier
  AUTONOMY.md. All edits re-verified against parallel-session work before
  landing (the #7 cleanup commits touched neither file; the new
  COMMUNICATION.md doc is unrelated territory). Docs only — no `site/`
  change, no SW bump.
  Same-session follow-up: stripped the hand-restated grant scope the first
  pass had left behind — each repo now carries managed floor + delta only
  (4a95c17 here; rpi 741377d; hitchbots eba418f, which also bumped its pin) —
  and bumped this repo's atelier pin 05b4a98 → 2b8da3b after reading the
  drift (signing hardening, browser-fetch instrument, COMMUNICATION.md,
  AUTONOMY ask-names-both-sources; floor unmoved).

