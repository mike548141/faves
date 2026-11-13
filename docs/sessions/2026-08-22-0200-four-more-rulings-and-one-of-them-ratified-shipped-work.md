## 2026-08-22-0200 — four more rulings, and one of them ratified shipped work

A second round of questions, and the same pattern as the first: **two of the
four went against the recommendation put to him.** Recorded that way on purpose.

- **A direct link to a filtered-out venue OPENS**, carrying one quiet line
  naming the limit and offering to widen it. Blocking was rejected — the sender
  never knew what limit the recipient set, so a blocked link fails for a reason
  neither party can see. 🔑 The note is not an apology for the filter; it is the
  one moment the setting becomes legible, on the page the reader is already on.
- **Closure becomes PER-BRANCH** — against the recommendation to leave it
  venue-level. The reason that holds is the item's own: venue-level means a shut
  branch can only be recorded by **deleting** it, destroying the record it ever
  traded, which is precisely what [ADR 0023] exists to prevent. This is `[L]`,
  and it also settles the *"Permanently closed × 8"* question underneath it —
  do that one **after**, because once closure is per-branch the repeats stop
  being repeats.
- **`until()` splits into `untilPresent` (site, exit 1) and `untilSettled`
  (timing, exit 2)** — the option that stops discarding what the author already
  knew. Needs a quiet window with no parallel session, in one commit.
- **Little Sprig Seatoun takes the conservative date, October 2025** — against
  the recommendation to keep the export date.

⚠️ **And that last one exposed a stale record — ours, made today.** The item
said the date was *"left at 2026-06-29"*. It was **already changed to
`2025-10-01` on 2026-08-17** (`60d9bb8`, *"a conservative date"*). So the ruling
**ratifies shipped behaviour and owes no work** — but the owner was asked to
decide something that had been decided five days earlier.
🔑 **How it survived, said against ourselves:** that paragraph was MOVED into
its proper item earlier the same day, to fix a findability defect — and the
session that moved it verified the *location* problem and never re-read the
*content*. **Moving a claim is not reading it**, and relocation is exactly when
the next reader assumes somebody just looked. A relocation pass should
re-verify every factual claim it carries.

🚩 **A peer faves session landed on `main` mid-session** (`0754a1b`, `69cdffb` —
Daily Bakery intake). Pulled and rebased onto cleanly; no overlap with anything
here, which is what disjoint file ownership is supposed to buy.

**Close state:** `main` clean, no worktrees, no branches, no orphaned browsers.
Nothing owed is uncaptured. Four rulings recorded; three of them carry work that
was deliberately **not started** at session close rather than half-started.

---

