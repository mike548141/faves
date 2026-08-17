- [ ] **Every guard here must declare: cheap failure, or forbid the act?**
  `[M][docs]` — arrived 2026-08-18 with the `atelier@e2fddc5` pin. Atelier's
  `GUARDS.md` gained a **fourth requirement** beside *narrow, noisy, reasoned*
  (owner's ruling, 2026-08-17), from `PRINCIPLES.md` §10 *Posture*: **engineer
  for the failure being cheap, not for the failure being impossible, and measure
  the posture by what you are free to do.** Every guard must declare which of two
  things it does — *makes the failure cheap* (the bad event still happens and is
  survivable; the cost is building the recovery) or *forbids the act* (the bad
  event is prevented by removing the ability; the cost is freedom of action,
  permanently). **Both are legitimate. The defect is not declaring which.**

  🔑 **Why the declaration is not paperwork.** Every guard here already carries a
  reason, and a reason with no standard behind it is a sentence; the same reason
  answering *cheap-failure or forbid-the-act* is a claim someone can test,
  re-cost and argue with. It closes the asymmetry this estate already has — a
  reason is demanded for **weakening** a guard and none for **building** one.

  **The population is large and already written down.** `CLAUDE.md`'s verify
  fence is ~20 entries: the Python gates (`validate`, `check_no_deps`,
  `gen_sbom --check`, `check_versions`, `check_fallback`, `check_decisions`,
  `check_visibility`, `check_fx`, `seed_*_ids --check`, `split_data --check`),
  the thirteen browser checks, `node --test`, plus the inherited atelier floor
  scanners and the `protect-main` ruleset. Most will declare *makes the failure
  cheap* — a check that runs after the fact and tells you what broke does not
  remove your ability to break it. The interesting ones are where the answer is
  **neither**, and that is what the pass is for.

  ⚖️ **Two limits, inherited verbatim, so this is not read as a licence.** A test
  arriving after the work is grounds to **declare**, never grounds to unwire a
  working gate on the author's own judgement — a guard that fails the test is a
  **finding for the owner**, not a revert. And declaring *forbids the act* is not
  a failure grade: much of this repo's floor is prevention, deliberately.

  🔎 **This is [ADR 0072]'s question asked from the other side, and the two must
  be run together or the second one lies.** ADR 0072 asks *is this guard's verdict
  independent of the thing it guards* (decorative or not). The fourth requirement
  asks *what does this guard buy, and what does it cost*. A guard can pass 0072 —
  genuinely verdict-dependent — and still be the wrong instrument, and a
  decorative guard declaring "makes the failure cheap" is asserting a recovery it
  never triggers. 🚩 **The known collision is already on this board:** *only
  `boot_check` runs in CI*, so twelve browser checks declare a posture that
  depends on a human typing them. Under the fourth requirement that is not
  "advisory"; it is a guard whose declared answer is **unsupported by its
  wiring**.

  🚩 **And §10's precondition is the part most likely to be assumed here.**
  *"We will know if something goes wrong"* carries the whole posture and has the
  least mechanism behind it — rotation is provable by rotating and restore by
  restoring, but **detection has no equally cheap proof**. On this repo the
  relevant instance is measured, not theoretical: `protect-main` requires six
  checks and `bypass_actors` carries `RepositoryRole 5 → always`, so the last 100
  ruleset evaluations on `main` were 100 bypasses, and a push **is** the deploy.
  Any guard declaring "cheap failure" on the strength of CI has to say how the
  failure is noticed when CI's red lands *after* the deploy it describes.

  🎯 **What is owed, and it is the owner's call how far it goes.** The mechanical
  half — walking the verify fence and writing one declaration per guard — is a
  session's work and needs no ruling. The half that does not is what happens to a
  guard whose honest answer is *forbids the act, and the recovery was buildable*:
  the inherited limits say **file it, don't revert it**, so the output of this
  pass is a list for him rather than a diff. Do not start the pass and the
  re-ranking in the same sitting, for the reason atelier gave when it queued its
  own: nothing should be re-litigated by the sitting that wrote the rule.

  📎 Source: atelier `docs/method/GUARDS.md` § *The fourth requirement —
  declared* and `docs/method/PRINCIPLES.md` § *10. Posture*, at pin `e2fddc5`.
  Neither is in the canonical floor region, so **this is not stamped-copy drift**
  — it is inherited doctrine owed a local application, which is why it is an item
  and not a `CLAUDE.md` edit.

[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
