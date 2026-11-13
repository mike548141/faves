## 2026-08-16 01:58 UTC — the pin moves, and the Laws leave the apex

**Ask.** Owner, mid-session: "Check and move the atelier pin if needed." A
parallel session was live in this repo throughout (`faves-c4`), so every change
here landed as one small commit on a clean tree, pushed immediately.

**What the drift check found — and what it missed.** 38 commits on atelier's
`origin/main` since `72cf216`. The doctrine delta is confined to the first 22
(`72cf216..eef38be`); the 16 newer ones are cold-pass reviews, board items and
session records that touch no file under `docs/method/`. Ten method documents <!-- pathscan:allow: atelier cross-repo path — docs/method/ exists in atelier, not in this repo's tree; the same allowance CLAUDE.md and MODEL-ECONOMICS.md already carry -->
moved, but only three carry text this repo inlines.


The check as written would not have found any of it much longer. It read the
atelier checkout's `HEAD`, and that checkout was **16 commits behind its own
origin** — so a pin at the true tip makes `<pin>..HEAD` run *backwards* and
report nothing. Measured, not reasoned: `0107000..HEAD` returns 0 commits on a
tree whose doctrine had moved 38. That is the third instance in this repo of the
failure the same bullet exists to describe — a guard that cannot fire is worth
no more than one that always does. The bullet now fetches and reads
`origin/main`.

**What propagated.** The Three Laws and the Zeroth are **removed** from the apex
(atelier `71b3e8f`); the apex is now honesty, then adaptation. The dilemma
line — which had been carried inside the Laws section — survives on its own as
honesty doctrine, in atelier's new wording (`c782e14`). And the always-confirm
floor changes shape: the principal's authority is **absolute and never decays**
(`38add7c`). What being informed conditions is not the authority but the
*ruling* — an approval given without a what/why/impact briefing still stands as
his word, and is challengeable **on the briefing**, by re-briefing and asking
again. It is never a licence to overrule him. The previous wording ("not a
decision the doctrine recognises") had put the condition on the authority
itself, which is the error being corrected.

**What deliberately did not propagate.** The board-store split — one file per
roadmap item, a generated index — rewrote `RECORD.md` and added a section to
`CONCURRENCY.md`, but it is explicitly scoped: "a repo that has not adopted the
split keeps the monolithic form". Faves keeps `ROADMAP.md` and the relocation
discipline that goes with it, so neither change is owed here. `COMMUNICATION.md`
also unwired the `plainscan` reply gate — faves has never wired it, so the only
thing owed was a **factual correction**: this repo's drift bullet claimed
plainscan "still shows" the always-fires failure. It no longer does. The reason
it came out is worth keeping: a `Stop` hook fires *after* the reply has streamed,
so it could detect the fault but never retract anything — 29 turns blocked and
~123,500 characters reprinted before that was noticed.

**Verification.** `validate.py` 38 files 0 errors (14 pre-existing warnings, all
`picks`); no-deps, SBOM and visibility clean; the full pre-commit floor green
(15 checks, 4 warn-only). Docs-only — nothing under `site/` — so no
`SHELL_VERSION` or `DATA_VERSION` bump was owed, and the Pages deploy is a
no-op. Pushed as `2df2564`.

