# Session records

One file per working session, named for the time the session started:
`YYYY-MM-DD-HHMM-slug.md`, the time in UTC (the house doctrine's RECORD.md,
§ *The session log*). The folder is the index. The names sort by start time,
so a session getting its bearings reads the newest few files, for example the
ones `ls docs/sessions/[0-9]* | tail -5` lists, and opens older ones only when
it needs them. Some older names carry a two-digit counter where the time
would be (`YYYY-MM-DD-NN-slug.md`). This README is the only file here that is
not a session record.

<!-- archivecut:retired-log-below -->

## The retired one-file session log

This repo once kept a one-file session log beside this folder as well. It
was retired by atelier's `archivecut.py`: each of its entries now sits, word
for word, near the top of the session file it linked, or in a new file named
for its date where it linked none, under the line "From the retired session
log". Below is the rest of that file, word for word: its preamble and
anything else that was not an entry, inside fences so that it is read as a
record and nothing acts on it. The comment lines carry its line numbers, so
`archivecut.py --verify` can rebuild the file from this folder byte for byte.

### `docs/SESSIONS.md`, retired

<!-- archivecut:retired docs/SESSIONS.md lines=299 final-newline=yes last=3c3fd8e5 -->

<!-- archivecut:log-text docs/SESSIONS.md 1+39 -->
````
# Faves session log (append-only index)

One entry per working session, newest LAST. **Append-only content** — an
entry is never edited or reordered once written. At session start read only
the recent tail (`tail -60 docs/SESSIONS.md`); the full history is for
grepping, not for loading whole. When the index outgrows its budget it
**rotates**: the recent tail stays here, older entries move verbatim to
[`SESSIONS-ARCHIVE.md`](sessions/2026-07-18-archived-000-faves-session-log-archive.md) (grep on demand, never load
whole) — the current-truth/history split, same as `ROADMAP`→`ROADMAP-DONE`.
A substantial session may also put full detail in `docs/sessions/` and carry
a one-line pointer here. Convention adopted from `ros`/`tiki` (2026-07-08);
rotation added 2026-07-18.

<!-- sessions-split 2026-11-13: every line above this one is the index's original preamble, unchanged -->
**Split into an index and detail files, 2026-11-13** (owner-approved: moves
only, nothing deleted). Every entry written before the split now lives whole
in its own file under `docs/sessions/`, named `YYYY-MM-DD-HHMM-slug.md`, and
has one line below, in its original order. The move was verbatim but for one
change: a relative link inside an entry gained a `../`, because the file now
sits one directory down. The proof that nothing else moved is in the split
session's own record (the last line here). Where an entry's heading gave a
time, the file name carries it. Where it gave only a date (79 of 164), the
file's date and time are those of the commit that first wrote the entry, in
UTC, and its line marks the time with `~`: a commit time is when the entry
was written, not when the session began, so read it as an upper bound. The
heading inside each file keeps its date as written. From here on a session
writes its detail file and adds one line at the bottom.

**The rotated archive was cut the same way, 2026-11-20** (owner-approved:
split, or move whole if a split would lose anything). `SESSIONS-ARCHIVE.md`
is now 38 files in `docs/sessions/`, named `…-archived-NNN-…` in their old
order, with one line each in the block below; `000` is its preamble. atelier's
`archivecut.py --verify` rebuilds the old file from them byte for byte. The
link to it in the preamble above is the one word the cut changed there: it now
points at that `000` file, because the old file is gone.

<!-- indexscan:maps dir=sessions match=*.md -->

<!-- archivecut:begin docs/SESSIONS-ARCHIVE.md -->
````

<!-- archivecut:log-text docs/SESSIONS.md 114+1 -->
````
<!-- archivecut:end -->
````

<!-- archivecut:log-text docs/SESSIONS.md 280+10 -->
````
<!-- sessions-split:moved-end -->
## 2026-11-13 — atelier pin `0a2b7a7` → `2a6d7a4`, and an estate health sweep (session `52b6d566`)

Dispatched by an estate health sweep, orchestrator session e820bff5. Floor
re-copied word for word and the pin moved; `CLAUDE.md` text the delta made
false fixed (BS1 retired on its own trigger, estate-root section, cold-reviewer
clause); `.leakscanbinaries` lists all 50 tracked binaries ahead of the
2026-11-18 G3 date (`340/340` closed); visibility declared public, which
filed `340/350`; two house hooks added. Detail:
[`sessions/2026-11-13-0614-pin-bump-2a6d7a4-and-health-sweep.md`](sessions/2026-11-13-0614-pin-bump-2a6d7a4-and-health-sweep.md).
````
