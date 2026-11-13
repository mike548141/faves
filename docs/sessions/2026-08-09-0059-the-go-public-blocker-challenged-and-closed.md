- **2026-08-09 (the go-public blocker, challenged and closed — Opus 5)**: Came in
  to execute the "rotate the PAT" blocker another session had named as the one
  thing between faves and public. **It didn't survive contact with the evidence.**
  `github.com/settings/tokens` reports *"No personal access token created"* — no
  classic tokens exist on the account at all, so the `SESSIONS-ARCHIVE.md` line
  recording one as *classic + broad* is already historical, which is precisely
  the condition ADR 0022's "publish the records as-is" ruling needed. Nothing to
  rotate; the prerequisite discharged by evidence rather than action. Owner ruled
  the bundled AWS/Google/TrueNAS half **decoupled** to the estate roadmap: what it
  discloses is content-free (three providers named, no identifiers, endpoints or
  weaknesses), and gating a static menu site on a whole-estate hardening
  programme is disproportionate. Both recorded in
  [ADR 0026](../decisions/0026-pat-prerequisite-discharged.md), which amends 0022's
  consequences without touching its accepted analysis.

  **Corrected while there:** ADR 0022 rejected redacting the archived line because
  the text "stays reachable in every clone". That is **false for this repo** —
  private since 2026-07-06, zero forks, and clone traffic shows two unique
  cloners, both the owner's own machines. No third-party clone exists, so a
  rewrite *would* genuinely erase it. The conclusion survives on a different
  reason: **44 commit SHAs are cited across the ADRs, session logs and reviews**,
  and a `filter-repo` strands every one — the same cost that defeated the
  fresh-root option on 2026-08-06. Anyone re-proposing a rewrite must argue
  against that, not the clone claim.

  **Step 3 gates re-run on `f3c9607`** — leakscan `--require-terms`, publishscan,
  licenscan, validate, check_no_deps, gen_sbom `--check` all clean; `node --test`
  372/372. secretscan **exits 0**: its one `tools/deploy.json:3` hit (the
  Cloudflare `account_id`) is advisory output, not a failure, and
  `.atelier-floor.json` enforces only the licence declaration.

  **Gap found and closed:** ADR 0022's full-history evidence was taken at
  `0243e9c`, but HEAD had moved 28 commits. A commit that added-then-removed
  something would be invisible to a HEAD-only scan. Extracted all 176 blobs from
  the `0243e9c..HEAD` delta and scanned them: secretscan clean, and leakscan
  `--require-terms` returned **zero term-list hits** — no family names, no home
  address, nothing personal. Its only findings were venue addresses and phones in
  `takeaway-at-churton.json`, the disposed product-data class (they surfaced only
  because flattening the blobs for extraction defeated the `.leakscanignore` path
  globs). One file was added-then-deleted in the window: a `tag_allergens` `.pyc`.

  🎯 **Left with the owner, not decided here:** (1) confirm the token screenshots
  came from the `mike548141` account — they came from a browser profile labelled
  *Work*, and if that is a different account the central finding doesn't hold;
  (2) whether the Cloudflare **account name + ID** in `tools/deploy.json` should
  publish (not a secret — it is in every dashboard and API URL and authorises
  nothing — but it is a live-account identifier and has never been explicitly
  ruled on); (3) the same for the **credential architecture** described across 6
  files, incl. the keychain item name and exact child-token scopes. No values
  anywhere in any of the three.

