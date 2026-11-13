## 2026-08-09 — Four owner rulings, applied (orchestration, cont.) — Opus 5

The queue run's open questions were put to the owner and all four ruled.
Recorded here because three of them settle things a future session would
otherwise re-litigate.

**1. The cross-repo tension is closed — in favour of queueing.** The
2026-08-09 entry above surfaced two rules that did not agree on whether a
faves session may write a *finding* into atelier's roadmap. The owner ruled
**yes**: a child may **queue** a finding upstream, never deliver one. The
standing correction — faves lives within the doctrine and does not create
it — is untouched and still binds, because a finding is not doctrine. Acted
on immediately: the `/.well-known` extraction defect is now atelier
`ROADMAP.md` **Track E, item E8** (`atelier@88a54a3`), carrying the minimal
repro and explicitly no fix, no test and no marker written upstream. It went
to Track E because that track's stated premise *is* this defect — a false
positive on a correct line trains people to suppress, and that is how a
scanner stops being read.

**2. `plainscan` is scoped to the live docs.** Owner ruled "live docs only,
exempt the records". Implemented as `.plainscanignore`: **1177 findings →
582**. The line drawn, and written into the file so it survives this
session: *a record is written once and never rewritten, so editing one to
please a scanner is rewriting history* — the same ground that stopped this
session's `pathscan` sweep touching those files. Exempt: `SESSIONS.md`,
`SESSIONS-ARCHIVE.md`, `ROADMAP-DONE.md`, `docs/reviews/`, `CHANGELOG.md`.
Deliberately still checked: `ROADMAP.md` (196 findings) — it is live
current-truth and the first file a new session reads, not a record.
🎯 **One sub-question left open and flagged, not silently decided:** accepted
ADRs carry ~180 findings and cannot be fixed, because the house forbids
editing an accepted decision — so they will stand forever. Exempting
`docs/decisions/` would also stop checking *new* ADRs, which is a real
fail-open. Left checked; the owner has the call.

**3. The refresh caveat gets a method-and-age policy.** Owner ruled a reading
counts as a check when it came from the shop itself — **in store, a paper
menu, the shop's own named website, or by phone** — and never from a
third-party listing or a delivery app (*"not third parties like delivereasy,
uber etc"*), **plus an age limit**. Built on `faves-refresh-policy`; the
12-month figure is a **house default chosen by this session, not an owner
number**, and is one named constant so it can be retuned. See ADR 0036.

**4. The noun sweep stands as shipped.** All three judgement calls put to the
owner — keeping *branch* rather than forcing *places* everywhere, the
reordered Distance dials, and the allergen caveat's *venue* → *place* —
were confirmed. No reverts.

---

