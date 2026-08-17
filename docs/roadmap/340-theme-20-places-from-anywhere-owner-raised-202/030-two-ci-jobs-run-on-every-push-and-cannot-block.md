- [ ] 🚩 **Two CI jobs run on every push and cannot block one** `[S][owner]` —
      found 2026-08-16 (wt: faves-schema30), verified against the ruleset API,
      not read off the workflow file. `protect-main` (ruleset 20597160, active)
      requires exactly **four** contexts: `floor / scanner floor` ·
      `menu data validates` · `zero dependencies` · `JS unit tests`.
      **Not required: `service-worker version lockstep` and `every screen
      boots`.** Both run; neither gates.
      🛑 **The version one is the sharp end, because on this repo a push IS a
      deploy.** That gate exists *because* an unbumped `SHELL_VERSION` shipped to
      the owner's own phone with CI green — an unchanged constant makes the
      install step skip the cache, so old files serve forever. Advisory, the only
      thing between that recurring and a reader is somebody noticing a red badge
      **after** the deploy has gone out. `every screen boots` was just wired in
      and deliberately chosen as *"the one that is safe to make REQUIRED"* — it
      is not yet required, which is a one-line settings change, not new work.
      🛑 **AND A LAYER ABOVE BOTH, which changes what the fix even is.** Raised
      by faves-ea, verified here directly against the ruleset API rather than
      inferred: `protect-main` carries
      `bypass_actors: [{actor_type: RepositoryRole, actor_id: 5, bypass_mode:
      always}]`. **Admin bypass is unconditional**, so even the four *required*
      checks cannot block a push from the owner's own machine — which is where
      most pushes come from. Three sessions saw
      `Bypassed rule violations for refs/heads/main` on their pushes tonight and
      read it as noise. **So promoting the two advisory jobs to required buys
      less than it appears to**, and the honest framing of the ask is two
      questions, not one.
      🎯 **Owner's call, and it is genuinely two decisions** — both repo
      settings, both his:
      ✅ **(a) RULED AND DONE 2026-08-16 — required checks went 4 → 6.** Both
      `service-worker version lockstep` and `every screen boots` are now in
      `protect-main`'s required list; verified directly against the ruleset API,
      not taken on report. Do **not** extend it to `cook_check`/`sync_check` —
      both are measurably contention-flaky and a flaky required check trains
      everyone to hit re-run, which is worse than no check.
      ⚠️ **And the honest limit, which must stay attached to (a) wherever it is
      quoted: the practical effect today is NIL.** `bypass_actors` is unchanged,
      so pushes from the owner's machine still bypass all six. (a) takes effect
      only if (b) moves. A session first reported this change as *"closing the
      stale-menu hole"* and had to correct itself to the owner — on its own it
      does not.
      🔑 **What moved this, worth reusing:** the abstract argument about guard
      layers had been in front of him for a while and did not land. What landed
      was the concrete pairing — *the gate written because an unbumped
      `SHELL_VERSION` shipped stale files to his own phone is the specific one
      that cannot stop it happening again*, on a repo where a push is a deploy.
      **A named past incident beat a principle.**
      ⏳ **(b) Decide whether admin bypass should stay `always`** — deliberately
      deferred by the owner, not overlooked. It is defensible
      — a solo owner locking himself out of his own default branch is a real
      cost, and the doctrine floor names lockout-class changes as
      stop-and-confirm. But while it stands, *every* required check on this repo
      is advisory for the person who pushes most, and (a) is close to cosmetic
      without it. `evaluate` mode, or bypass on pull-request only, are the
      middle options. **This one is his alone and must not be changed for him.**
      🔑 **And a second-order finding worth more than the first, from faves-
      hygiene: this was nearly reported wrong, and the reason generalises.**
      The required list is read **by job name**, and the job displayed as
      *"zero dependencies"* also runs `check_decisions`, `check_fallback`,
      `gen_sbom --check` and `check_visibility` — four steps its name does not
      describe. Auditing coverage by job name therefore reports the **ADR-index
      allocator as ungated when it is properly gated**. This is not a decorative
      *guard* (ADR 0072) — the guard works — it is a **decorative label**, and
      the damage lands on the auditor rather than the code. The cheap fix is a
      rename (`repo invariants`), not another check. Same family as the
      all-clear that cannot be falsified: **the observable output does not
      distinguish the two states an honest reader needs to tell apart.**

      ✅ **SHIPPED 2026-08-17 (`344adfb`, wt: faves-hyg-ci).** Job `every screen
      boots` in `.github/workflows/ci.yml`, on every push to `main` and every
      PR. `CLAUDE.md`'s notes are corrected (`4fcb05e`).
      🔎 **Chrome was measured on the runner, not read from documentation.** A
      throwaway probe job reported Google Chrome **151.0.7922.108 preinstalled**
      at `/usr/bin/google-chrome` on `ubuntu-24.04` image `20260810.271.1` —
      the same major version this laptop runs, so CI and a local run measure the
      same browser. `FAVES_CHROME` is the only hook needed; `browser.mjs` was
      not edited, **no marketplace action was added** (a public repo's workflow
      is a trust surface) and **no `--no-sandbox` / `--disable-dev-shm-usage`
      flags were needed** — that advice is container folklore and these runners
      are VMs (`/dev/shm` 7.9 GB, headless launches clean as unprivileged
      `runner`, despite `apparmor_restrict_unprivileged_userns=1`).
      🔑 **A preflight step asserts the browser exists BEFORE the check runs**,
      so an image that drops Chrome reads as *"the runner lost its browser"* and
      not as *"a screen failed to boot"*. Costs two seconds; it is the
      difference between a guard and a guard pointing at the wrong thing.
      ✅ **Burn-in: 7 runs on the runner, 7 green, 0 failures**, every one
      reaching `OK — 24 passed, 0 failed` with N checked, not just the verdict.
      **8–12 s** per check step, 16–21 s per job. **Added wall-clock per push: 0
      s** — it runs in parallel and finishes before the longest existing job.
      **Actions minutes: nil** — public repo, standard runners are free; that
      changes only if this repo ever goes private. The `pull_request` path is
      proven too (PR #4, since closed). The number and the failure count are
      recorded rather than "burned in clean", because the latter is testimony.
      ✅ **And it is proven NOT decorative, by reintroducing the exact bug it
      was written for** — `venueTimezone` dropped from `app.js`'s import list.
      **Every other job stayed green** (unit tests, data validation, zero-deps,
      version lockstep) and the boot job alone went red, naming the symbol, the
      file, the line and the call chain into `init()`.
      🛑 **What it CANNOT do, stated because everyone including this session had
      been claiming otherwise.** `protect-main` lets a repository admin bypass
      required checks (`bypass_mode: always`), and **the last 100 ruleset
      evaluations on `main` were 100 bypasses** — measured, not one anecdote. On
      the normal path a push to `main` **is** the Cloudflare Pages deploy, so
      the sequence is **push → deploy → red afterwards**. The job is not in the
      required-checks list either, so it does not block a PR merge. A peer
      cleared this change with *"if I ship a change that makes a screen's JS
      throw, I want the push to fail"* — **it will not fail; it will go red
      after the broken site is live.** Still worth having, and a materially
      weaker claim than the one being made.
      🚩 **`service-worker version lockstep` is ALSO absent from the required
      list** — the gate written *because* an unbumped `SHELL_VERSION` shipped to
      the owner's own phone is advisory on every path. 🎯 Whether either becomes
      required is repo settings and therefore the owner's; it is being put to
      him from the session holding the live version-bump instance, as one ask.

      ✅ **ANSWERED same day: the owner authorised it and a peer made the
      change — `protect-main` now requires SIX contexts**, adding `every screen
      boots` and `service-worker version lockstep`. Verified independently
      against the ruleset API rather than taken on report. 🔑 **The boot job had
      to exist before it could be required**, so the CI wiring above is what
      made the addition possible.
      🛑 **But `bypass_actors` is UNCHANGED — `RepositoryRole 5 → always`.** So
      a push from the owner's machine still bypasses all six, and **on its own
      this closes nothing in practice today.** The peer nearly overstated it to
      the owner and corrected itself; that correction is the load-bearing part
      and is preserved here rather than smoothed into a win. 🔑 The resting
      state is now **required-but-bypassable** — better than advisory, not the
      same as enforced, and it takes effect the moment the bypass is narrowed.
      🎯 **Narrowing the bypass is a separate owner decision he has NOT taken**;
      the peer recommended leaving it for now. Do not treat this item as
      protected by the requirement.
      🚩 **A near-miss worth more than the finding it came from:** a peer nearly
      reported `check_decisions.py` as ungated too. It is not — it, plus
      `check_fallback`, `gen_sbom --check` and `check_visibility`, are **steps
      inside the `guard` job, whose display name is "zero dependencies"**, and
      that job *is* required. The required list is read by **job name**, and a
      job name describing one of its five steps makes the other four invisible
      to anyone auditing coverage. Not a decorative guard — the guard works — a
      **decorative label**, whose victim is the auditor rather than the code.
      🛑 **The ruling's stated reason does not survive contact, and this is the
      correction that matters most.** `boot_check` was chosen because it "makes
      no timing assumptions" — true of its *assertions*, and **the 30-second CDP
      timeout is in the TRANSPORT**, in `tools/lib/browser.mjs`, shared by all
      ten checks. Measured by a peer on this laptop with five sessions live:
      `boot_check` **2 of 4 runs failed**, `recipe_check` **4 of 8 aborted**,
      every failure on that one timeout. So flakiness is a *harness* property,
      not `cook_check`'s, and freedom from timing assumptions in the body bought
      nothing. **Worse: `boot_check` renders a transport timeout as
      `FAIL <assertion name>` and exit 1** — byte-indistinguishable from a real
      regression, where `recipe_check` at least dies with exit 2 and *looks*
      like infrastructure. That is a fresh instance of the pattern in this
      theme, and the fix is one file above all ten checks: classify a transport
      timeout as a harness error with its own exit code so a flake is
      structurally unable to impersonate a regression. **Not observed on the
      runner (7/7)**; this is a loaded-machine finding, and it is machine-
      independent in principle.
      📌 **Count correction: there are TEN browser checks, not eight** — the
      family grew under the item (`recipe_check` and `note_check` joined). Nine
      remain on the honour system. `boot_check` was never on `CLAUDE.md`'s
      fenced verify list at all despite its own prose saying to run it; it is
      now.
