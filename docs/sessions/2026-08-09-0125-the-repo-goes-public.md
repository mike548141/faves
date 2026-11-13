- **2026-08-09 (the repo goes public — Opus 5)**: 🎉 **faves is public**:
  <https://github.com/mike548141/faves>. Flipped at `a207a15` on the owner's
  explicit instruction, with steps 5–8 applied in the same sitting and 9–12
  closed out. Full outcome in [GO-PUBLIC.md](../GO-PUBLIC.md); ADR 0022 stamped.

  **What cleared the way.** The inherited blocker ("rotate the PAT, confirm the
  credential roots") did not survive checking: there are **no classic tokens on
  the account**, so the archived *classic + broad* line was already historical —
  nothing to rotate ([ADR 0026](../decisions/0026-pat-prerequisite-discharged.md)).
  The owner decoupled the AWS/Google/TrueNAS half to the estate roadmap. Gates
  re-run clean on the exact flip tree, and a gap ADR 0022 had left open was
  closed: its full-history evidence was taken at `0243e9c`, 28 commits stale, so
  all 176 blobs in the delta were extracted and scanned — secretscan clean,
  leakscan `--require-terms` **zero term-list hits**.

  **Owner ruling that sharpened the design rule.** Asked whether the Cloudflare
  account id should publish, the owner's answer reframed it: *don't write an
  identifier into the repo if the product doesn't need it* — a **design** rule
  about what goes in, not a publication rule about what comes out. It wasn't
  needed (`resolve_account_id` auto-picks when the token sees one account, which
  a repo-scoped token does), so both keys left `deploy.json` and secretscan went
  from one advisory finding to zero. `DEPLOY.md` also stopped restating the
  keychain item names and mint procedure — CLAUDE.md's *point up, don't
  re-derive* rule already covered that; it now points at the estate root. On the
  same reasoning the owner **reaffirmed full history** knowingly: the design rule
  governs new writes, and a rewrite would strand 35 of 38 cited SHAs across 181
  commits to erase an identifier that authorises nothing.

  🔎 **Two runbook commands were wrong when run** — both corrected in place in
  GO-PUBLIC.md, and worth knowing because one would have been silent:
  1. **Step 6's required status checks were `CI` and `floor`. Neither exists.**
     Contexts match *check-run* names, not workflow names; the real ones are
     `floor / scanner floor`, `menu data validates`, `zero dependencies`,
     `JS unit tests`. As written the ruleset would have waited forever on checks
     that never report, **blocking every push to a repo where a push is the
     deploy**. Caught only by running the runbook's own verification command
     *before* creating the ruleset rather than after, as it was ordered.
  2. **Step 7's `ALL_EXTERNAL_CONTRIBUTORS` is rejected (HTTP 422)** — the API
     values are lower-case. Loud, so it cost nothing.

  Also found: step 8 needs a **second** call (`selected-actions`) to populate the
  allowlist — the documented one only sets the mode, and without the second the
  floor workflow cannot resolve `mike548141/atelier/...`. Verified after: both CI
  and floor ran green on the next push (`b61b2e2`) under the narrowed policy, the
  repo answers 200 unauthenticated, and `security.txt` serves live.

  **Standing obligation, unchanged by the flip:** leakscan's term list is
  machine-local and CI still cannot reproduce it, so CI cannot catch a
  term-list-only leak. The local `--require-terms` run before each push stays
  the real cover — and it matters more now that strangers can read the result.

