- [ ] **Every guard here must declare: cheap failure, or forbid the act?**
  `[M][docs]` — arrived 2026-08-17 with the `atelier@e2fddc5` pin. Atelier's
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
  the ~~thirteen~~ **eighteen** browser checks (re-counted 2026-09-09 — see the
  note at the foot), `node --test`, plus the inherited atelier floor
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
  `boot_check` runs in CI*, so ~~twelve~~ **seventeen** browser checks declare a
  posture that depends on a human typing them. Under the fourth requirement that
  is not "advisory"; it is a guard whose declared answer is **unsupported by its
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

  📎 Source: atelier `docs/method/GUARDS.md` § *The fourth requirement — <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
  declared* and `docs/method/PRINCIPLES.md` § *10. Posture*, at pin `e2fddc5`. <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
  Neither is in the canonical floor region, so **this is not stamped-copy drift**
  — it is inherited doctrine owed a local application, which is why it is an item
  and not a `CLAUDE.md` edit.

  ## 📏 THE POPULATION RE-COUNTED 2026-09-09 — it is 18, not 13

  This item's own subject is *declaring what each guard buys*, so a wrong count
  of the guards is a defect in the item rather than a detail of it. Counted from
  the tree, not from any prose:

  ```
  ls tools/*_check.mjs | wc -l          → 18
  grep -l 'lib/browser' tools/*_check.mjs | wc -l → 18   (all of them)
  grep -c 'run: node tools/' .github/workflows/ci.yml → 1  (boot_check, line 319)
  ```

  `addon` · `boot` · `branch` · `cook` · `device` · `distance` · `filter_row` ·
  **`fixture`** · `focus` · `geo` · `midnight` · `note` · `picks` · `precache` ·
  `recipe` · `served` · `sync` · `to_top`.

  | | Written | Measured 2026-09-09 |
  |---|---|---|
  | Browser checks | 13 | **18** |
  | Run by CI | 1 | **1** (`boot_check`) |
  | Declaring a posture nothing wires | 12 | **17** |

  🔑 **The correction makes this item's own argument stronger, not weaker.** The
  gap it calls *"a guard whose declared answer is unsupported by its wiring"* is
  **17 checks wide, not 12** — and it has grown by five while the item sat
  describing it as twelve. Every one of the five additions is a guard written
  because a unit test had already missed something, and every one of them runs
  only when a person types it.

  🚩 **`CLAUDE.md` IS ALSO WRONG ON THIS NUMBER, IN TWO PLACES, AND WAS
  DELIBERATELY NOT EDITED BY THIS PASS.** It says **"SEVENTEEN"** browser checks
  in one paragraph and lists **"sixteen"** as not run by CI in another. Both are
  off by one against the tree — the file `tools/fixture_check.mjs` is the
  eighteenth and is missing from both counts, as it is from this item's thirteen.
  🛑 **Not fixed here on purpose:** `CLAUDE.md` was owned by another session at
  the time of this pass, and an off-by-one in a doc is not worth a collision on
  the repo's most-read file. **This paragraph is the record that it is owed.**
  🔎 **And note the shape, because it is this repo's recurring one:** four
  independent records — this item, two paragraphs of `CLAUDE.md`, and the
  `to_top_check` description before it was corrected — each state a count of the
  same directory, and no two of them agree. A number restated in prose goes stale
  silently; the `ls` above is the only one of the five that cannot.

  🛑 **The bracket stays `- [ ]`.** Nothing in the declaration pass is done. The
  🎯 above stays live and unanswered: the mechanical half needs no ruling, and
  what to do with a guard whose honest answer is *forbids the act, and the
  recovery was buildable* is still his.

[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
