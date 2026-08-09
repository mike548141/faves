# Go-public runbook

The ordered steps for making this repo public. Evidence and reasoning are in
[ADR 0022](decisions/0022-publish-safety-review.md); this file is just the
sequence, so the flip is one sitting rather than a project.

🎉 **EXECUTED 2026-08-09** — the repo is public at
<https://github.com/mike548141/faves>, flipped at `a207a15` on the owner's
explicit instruction, with steps 5–8 applied in the same sitting and steps
9–12 closed out. This file is kept as the record of what was done, and two
commands in it were **wrong when run** — both corrected in place below, at
steps 6 and 7. Nothing here needs running again.

**Flipping visibility is an owner-only floor action.** It is a one-way door —
forks and clones survive any later unpublish. Nothing below should be run by an
agent on its own initiative.

**Why it is one sitting:** branch protection, fork-PR approval and secret
scanning are all *refused by the GitHub API on a private free-plan repo*. They
can only be set after step 4. Between step 4 and step 8 the repo is public,
unprotected, and a push to `main` deploys to the live site. Do not stop
half-way.

---

## Before the day

- [x] **1. The GitHub PAT prerequisite.** ✅ **Discharged 2026-08-09** — see
      [ADR 0026](decisions/0026-pat-prerequisite-discharged.md). There are **no
      classic personal access tokens** on the account
      (`github.com/settings/tokens` → *"No personal access token created"*), so
      the `SESSIONS-ARCHIVE.md` line describing one as *classic + broad* is
      already historical. That is the condition the "publish the records as-is"
      ruling needed. Nothing to rotate.

      The AWS / Google / TrueNAS credential-root hardening that used to be
      bundled here is **decoupled** (owner ruling, 2026-08-09) and moves to the
      estate roadmap as ordinary work. What the record discloses there is
      content-free — three providers named, no identifiers, endpoints or
      weaknesses — so it does not gate this repo.

      The account is confirmed: the fine-grained tokens visible alongside are
      `floorfleet-conformance` and `Portainer` — this estate's own tokens, so
      the listing is the account that owns this repo.
- [x] **2. Get the `floor` workflow green.** ✅ **Done at `8ba6218`
      (2026-08-06)** — green for the first time since 2026-07-25, as a side
      effect of the leakscan disposition: CI was blocking on the ~86 structural
      findings in the venue data, and the `.leakscanignore` took those to zero.
      **Not a fix of atelier P4** — CI still has no term list and still prints
      *"cover not guaranteed"*, so it cannot catch a term-list-only leak. Keep
      the local `--require-terms` run in step 3 as the real cover.

      ```sh
      gh run list --workflow=floor --limit 3   # expect: success
      ```
- [x] **3. Re-run the gates on the exact tree that will flip** — evidence goes
      stale, and ADR 0022's numbers were taken on `0243e9c`.

      ```sh
      python3 ../atelier/tools/leakscan.py --require-terms .   # expect: clean
      python3 ../atelier/tools/secretscan.py .                 # expect: clean
      python3 ../atelier/tools/publishscan.py .                # expect: clean
      python3 ../atelier/tools/licenscan.py .                  # expect: Apache-2.0
      python3 tools/validate.py && python3 tools/check_no_deps.py
      python3 tools/gen_sbom.py --check && node --test
      ```

## The flip

- [x] **4. Flip visibility.** Owner action, deliberate and explicit.

      ```sh
      gh repo edit mike548141/faves --visibility public --accept-visibility-change-consequences
      gh repo view mike548141/faves --json visibility
      ```

## Immediately after — do not defer these

- [x] **5. Enable secret scanning and push protection** (free on public repos,
      withheld from private free-plan ones — this is a net gain from flipping).

      ```sh
      gh api -X PATCH repos/mike548141/faves -f 'security_and_analysis[secret_scanning][status]=enabled'
      gh api -X PATCH repos/mike548141/faves -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
      ```
- [x] **6. Protect `main`.** A push to `main` is a deploy, and public means
      drive-by PRs. A ruleset is the modern form; classic branch protection
      also works.

      Send it as JSON — the nested arrays don't survive `gh api -F` form
      encoding:

      ```sh
      gh api -X POST repos/mike548141/faves/rulesets --input - <<'JSON'
      {
        "name": "protect-main",
        "target": "branch",
        "enforcement": "active",
        "bypass_actors": [
          {"actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always"}
        ],
        "conditions": {"ref_name": {"include": ["~DEFAULT_BRANCH"], "exclude": []}},
        "rules": [
          {"type": "deletion"},
          {"type": "non_fast_forward"},
          {"type": "required_status_checks",
           "parameters": {
             "strict_required_status_checks_policy": false,
             "required_status_checks": [
               {"context": "floor / scanner floor"},
               {"context": "menu data validates"},
               {"context": "zero dependencies"},
               {"context": "JS unit tests"}
             ]}}
        ]
      }
      JSON
      ```

      ⚠️ **Corrected 2026-08-09 — the contexts above were `CI` and `floor`,
      and neither exists.** Required contexts are matched against *check-run*
      names, not workflow names. Had it gone in as written, the ruleset would
      have waited forever on two checks that never report, blocking every push
      — the exact failure the verification command below exists to prevent.
      Run it *before* creating the ruleset, not after.

      `actor_id: 5` is the repository-admin role — that bypass is what keeps
      solo pushes working, since a push to `main` is how this site deploys.
      Drop the `bypass_actors` block if you'd rather force yourself through
      PRs, and add a `pull_request` rule at the same time if so. Check the
      status-check contexts match the job names actually reported:

      ```sh
      gh api repos/mike548141/faves/commits/main/check-runs --jq '.check_runs[].name'
      ```
- [x] **7. Require approval for fork-PR workflows** — otherwise a stranger's
      PR runs Actions on your account's minutes.

      ```sh
      gh api -X PUT repos/mike548141/faves/actions/permissions/fork-pr-contributor-approval \
        -f approval_policy='all_external_contributors'
      ```

      ⚠️ **Corrected 2026-08-09** — this read `ALL_EXTERNAL_CONTRIBUTORS`, and
      the API rejects it with HTTP 422. The values are lower-case:
      `first_time_contributors_new_to_github`, `first_time_contributors`,
      `all_external_contributors`. A loud failure, not a silent one.
- [x] **8. Tighten the Actions policy** from `all` to verified/selected, and
      consider requiring SHA pinning.

      ```sh
      gh api -X PUT repos/mike548141/faves/actions/permissions \
        -F enabled=true -f allowed_actions='selected'
      ```

      Note: the `floor` workflow calls `mike548141/atelier/.github/workflows/floor.yml@main`,
      so allow that repo when narrowing. ⚠️ **That takes a second call** — the
      one above only sets the *mode*; without this the allowlist is empty and
      the floor workflow cannot resolve its reusable workflow:

      ```sh
      gh api -X PUT repos/mike548141/faves/actions/permissions/selected-actions --input - <<'JSON'
      {"github_owned_allowed": true, "verified_allowed": true,
       "patterns_allowed": ["mike548141/atelier/*"]}
      JSON
      ```

      Verified 2026-08-09: both `CI` and `floor` ran green on the next push
      (`b61b2e2`) under this policy.
- [x] **9. Ship `/.well-known/security.txt`.** Held back deliberately until now
      — its contact is the GitHub advisories URL, which 404s while the repo is
      private, and the site is already live. Set `Expires` about a year out.

      ```sh
      cat > site/.well-known/security.txt <<'TXT'
      # Faves — https://lets-eat.myspot.nz
      # Static, offline-first PWA. No backend, no accounts, no third-party code.
      Contact: https://github.com/mike548141/faves/security/advisories/new
      Policy: https://github.com/mike548141/faves/blob/main/SECURITY.md
      Preferred-Languages: en
      Expires: 2027-08-06T00:00:00.000Z
      TXT
      ```

      Then bump `SHELL_VERSION` in `site/sw.js` (lockstep rule), add
      `/.well-known/security.txt` to the precache list if the shell precaches
      `.well-known/`, and commit. Verify after deploy:

      ```sh
      curl -sI https://lets-eat.myspot.nz/.well-known/security.txt
      ```

## Close out

- [x] **10. Verify the settings actually took** — a settings change that
      silently failed is the failure mode this whole gate exists for.

      ```sh
      gh repo view mike548141/faves --json visibility,hasWikiEnabled,hasDiscussionsEnabled
      gh api repos/mike548141/faves --jq '.security_and_analysis'
      gh api repos/mike548141/faves/rulesets
      gh api repos/mike548141/faves/actions/permissions
      ```
- [x] **11. Confirm the public view.** Open the repo signed-out (or in a
      private window) and read the README as a stranger would.
- [x] **12. Record it** — stamp the outcome into ADR 0022, add a `CHANGELOG.md`
      line, append a `SESSIONS.md` entry, and close Theme 8 in `ROADMAP.md`.
