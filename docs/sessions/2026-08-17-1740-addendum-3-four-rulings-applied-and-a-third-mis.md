## 2026-08-17-1740 — addendum 3: four rulings applied, and a third mis-recorded ruling found

Four owner decisions taken at the close and applied. Recorded here rather than
only in commits, because two of them correct earlier entries in this same log.

**1. CI additions — RULED, all four (`3d0d63e`).** `split_data --check`,
`test_registry`, `test_find_addons` and `test_tag_allergens` now run in CI;
`fetch_fx --check` deliberately excluded. 🔑 `split_data` gained `--against REF`
**first**, because the wiring would otherwise have been decorative: the
append-only half compares the *working tree* to a git ref, and on a clean CI
checkout `HEAD`-versus-`HEAD` can only agree. Proven on the runner rather than
asserted — the job log reads *"Comparing history against: cb51817…"* and *"2
compared against cb51817… for append-only"*.

**2. The `?service=` shim — DROPPED, and this repo mis-recorded his ruling.**
The item said the URL compatibility path was *"the part that must not be
dropped"*. His actual words:

> *"Drop it and thats not what I said. I said its fine to break URL's now
> because there are minimal users but ONCE there are lots of users we don't want
> to break URL's"*

🔑 **A conditional became an absolute in the writing down.** That is the **third**
record found today to overstate an owner ruling — after `340/110`'s five-state
attribution and the CHANGELOG entry that told readers the old key used to work.
🚩 **The pattern runs one way: records get STRONGER than the thing they record,
never weaker**, because a firm sentence is easier to write and easier to quote.
Three instances in one day is no longer an anecdote; it is a class, and the
cheap defence is to quote him verbatim beside any paraphrase.

His forward rule is now its own item (`010/020`), not a line in a closed one,
because **the permission it grants has a condition nothing here can detect**:
*"once there are lots of users"*, and this site measures no users at all, by
design. A live instruction with an expired premise reads identically to a live
one — the decorative-guard shape arriving at the doctrine layer. Three ways to
know are costed there; the decision is his.

**3. Denied actions — allowlist + disclose-at-the-moment.** He deliberately did
**not** take the blanket "never retry a denied action" option, and atelier's
`GUARDS.md` is why: *side-stepping must be observable*, and *making the escape
hatch painful invites worse workarounds*. `CLAUDE.md` now carries the disclosure
rule.
🔑 **And the diagnosis had to be corrected before the fix could be right: the
refusal came from AUTO MODE's classifier, not from a permission rule.**
`.claude/settings.local.json` already allows `Bash` outright here, so no
allow-list entry was ever in the way — a permission-shaped fix would have changed
nothing and looked like a solution. The machine-side half therefore lives in
`autoMode`: `--force-with-lease` allowed to a non-`main` branch (it refuses to
run if the remote moved, so it cannot silently destroy a peer's work); any
force-push to `main` by any syntax hard-denied; and **re-running a refused
command under a different spelling** hard-denied by name. ⚠️ That file is
gitignored and does not travel — `CLAUDE.md` carries the only record.

**4. The CI job name (`340/130`) — his call, still open.** Renaming *"zero
dependencies"* to *"repo invariants"* needs `protect-main`'s required-context
list edited in the same sitting, or the job is silently un-required.

⚠️ **Still open at close, and both are his:** the filter label's replacement word
(he asked for a better one than *"Order type"*; the te reo follows the English,
and `Momo tono` is drafted from two dictionary-attested words if the English
stands), and `340/130`.

**Close state:** `main` clean, no worktrees, no branches, no claims. Board 63
open · 18 done · 3 waiting. `SHELL_VERSION` `.127`.

