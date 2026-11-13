# 2026-11-13 0749 UTC — the session log split into an index and 164 detail files

**Dispatched by** an estate health sweep (orchestrator session e820bff5),
working headless in a detached worktree off `origin/main`, as a follow-up to
the owner's estate-wide health request, verbatim: *"I want you to bring each
repo up to an operational and healthy state. That means, * The latest atelier
pin * CI is green * The repo conforms with the latest atelier expectations like
the board and session files and if you think there are other things we should
be doing to make them healthy then ask me"*. The split itself was put to the
owner as an option and approved the same day, verbatim: *"Approve all
(Recommended)"*, on an option that read "Moves only, nothing deleted; each
shown as a diff in its repo's record" (an answer to options offered, not a
ruling in his words). Headless, so nothing was asked.

## What changed

- **`docs/SESSIONS.md` is now an index** in atelier `RECORD.md`'s form: the
  original 12-line preamble unchanged at the top, a dated paragraph saying
  what the split did, then one line per session, newest last, each a dated
  link to its detail file followed by the entry's own title as written.
  13,204 lines became 206.
- **164 entries moved whole** to `docs/sessions/YYYY-MM-DD-HHMM-slug.md`:
  41 written in the early bullet form (`- **date (title)**: …`) and 123 under
  a `##` heading, each with any `###` addenda that sat beneath it. An entry
  ran from its first line to the line before the next entry began, so the
  blank lines and `---` rules between entries travel with the entry above.
- **Kept as is:** the 2026-11-13 pin-bump entry, already in split form, stays
  in the index exactly as written. `SESSIONS-ARCHIVE.md` is untouched
  (`RECORD.md` keeps it as the rotation store).
- **One change inside the moved text, and only one:** 37 relative link
  destinations (to ADRs, reviews, the roadmap, `GO-PUBLIC.md`, one script)
  gained a `../`, because the files now sit one directory down. A link quoted
  inside inline code was left alone (linkscan ignores it, and it is prose
  about a link). `linkscan`: clean, 1,336 internal links resolved.
- **`indexscan` is now declared on the index**
  (`<!-- indexscan:maps dir=sessions match=*.md -->`): it found every one of
  the 165 files named and no dated line earlier than its file.
- **`.wrapscanignore` (new)** exempts `docs/SESSIONS.md` only: a
  one-line-per-session index is the record class wrapscan's own docstring
  names, and atelier exempts its own index the same way. The detail files
  stay scanned and are clean.
- **`.plainscanignore`:** the owner's 2026-08-09 exemption for append-only
  session history now covers `docs/sessions` too, since the same entries live
  there now.

## File names: the 79 entries with no time

85 entries gave a time in their heading (`01:20 UTC`, `0250 UTC`, or the
`-HHMM` form); their files carry it. 79 gave a date only. For those, the
file's date and `HHMM` are the UTC commit time of the oldest commit whose
diff added the entry's first line (`git log -S` on its first 48 characters,
`docs/SESSIONS.md` only), and the index line marks the time `~`. That is when
the entry was written, not when its session began, so it is an upper bound on
the start. Where it falls on the UTC day before the heading's own date
(New Zealand runs 12 to 13 hours ahead), the file name carries the UTC date;
the heading inside the file keeps the date as written. No time was invented.
The same rule is stated in the index's split paragraph.

## The proof that it was a move

A script rebuilt the old file from the new artefacts alone, without reusing
the split's own segmentation: the index text before the split marker, then
each linked detail file in index order with one leading `../` removed from
every link destination carrying one, then the kept entry. It also checks
every file in `docs/sessions/` is linked from the index. Output, at the
split commit, against `git show 6f7dd51a:docs/SESSIONS.md`:

```
post-split pointer lines after the kept entry (ignored): 0
original   :    820507 bytes   13204 lines  sha256 dad886ac964350cc
rebuilt    :    820507 bytes   13204 lines  sha256 dad886ac964350cc
moved files: 164 listed, 164 distinct; links un-pointed: 37
docs/sessions/*.md on disk: 165; not linked from the index: []
RESULT: IDENTICAL — every byte of every entry survived
```

The checker was break-probed before it was believed: one changed word in one
moved file made it print `MISMATCH` with the first differing byte, and an
extra unlinked file in `docs/sessions/` made it print `MISMATCH` naming the
orphan.

## Measured

- `floor.py --plane ci`: every enforced scanner passes, including
  `linkscan`, `sizescan` and `wrapscan`; `indexscan` (warn-only here) clean.
  Before `.wrapscanignore`, `wrapscan` blocked on the 165 long index lines,
  which is what that file answers.
- The pre-commit hook's `attribscan` reported 52 advisory findings on the
  split commit. They are attributions already in the moved entries, which
  count as added lines in that diff; editing them would be rewriting records,
  so they stand.
- Nothing under `site/` changed, so no version bump and no browser check.
- CI at the pushed head: in the closing report to the orchestrator, by run
  URL.

## Identifiers

- **Session:** `84039f05`, Claude Opus 5.5, 2026-11-13 07:49 UTC to close.
- **Commits:** `670a79de` (the split); this record's own commit follows it.
- **Pull requests:** none.
- **Board:** none completed, created or claimed.
- **Worktrees and branches:** none created; ran in the sweep's detached
  worktree `faves-sessions-0749`, which the launcher removes.
- **Agents:** none launched.
- **Other repos:** none written.
