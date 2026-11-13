## 2026-08-17-1655 — addendum 2: the record over-attributed the ruling, and the transcript says so

Correcting the addendum above, which quoted atelier's board capture as if it
were the owner's words. It is not. Chased into the live transcripts at his
request; both quotes below were verified in the JSONL by this session rather
than taken from the searching agent's report.

**What Mike actually wrote** — atelier session `1b189e23`, 2026-07-22 04:31:07
UTC, in passing at the end of a paragraph about harvest integrity:

> *"…anything with `[ ]` should not be in roadmap-done I would think, unless
> perhaps it is supersceeded, or no longer required."*

**That is all of it.** He never typed `[-]`, never typed `[^]`, and never
enumerated candidate states. The two brackets were the **assistant's**
invention. Its close-out the same day handed them back to him as *"Your
five-state proposal (`[-]` declined, `[^]` superseded)"*, and commit `2cd4730`
wrote that onto the board as *"(Mike, 2026-07-22, mid-build) — proposal: add…"*.

🔑 **A record that says "Mike proposed X" when Mike said something narrower is
worse than a record that says nothing.** It is quoted forward carrying his
authority, so the next reader argues against a position he never took — and this
session did exactly that, then cited the mis-attribution back at him as though it
settled the matter. Neighbouring failure to
`a-records-summary-can-be-narrower-than-its-decision`, running the other way: the
summary was **wider** than the source.

✅ **The ruling itself is real and binds; only its provenance was wrong.** It is
dated **2026-07-23 02:16:54 UTC**, not 07-22 — put to him as a proper choice
(*"① Keep the three checkbox states, or extend to five (add 'declined' and
'superseded')?"*) and answered **"Keep three (Recommended)"** (session
`64f68104`). Our legend's date is corrected.

📤 **Owed UPSTREAM to atelier and not fixable here:** its board README and the
`2cd4730` capture both attribute the five-state proposal to him. One line in
each; the evidence is in `340/110`.

🚩 **One process note, reported because it should not be quiet.** The searching
agent flagged that partway through its run a block arrived **inside a tool
result**, shaped like a system-reminder from *"the coordinator"*, pre-supplying a
commit SHA and quote as already verified and pressing it to confirm rather than
search. It distinguished that block from the legitimate `cross-session-message`
in the same output, declined to trust it, and re-verified everything against git
before using any of it — which is the correct behaviour and is why this entry can
be trusted. **The likeliest explanation is benign: this session did send it
exactly that SHA and quote, to narrow a search that had already failed once, and
the harness may have rendered it in that shape.** That is a guess, not a finding.
What is not a guess is the lesson: 🔑 **handing an agent the answer you expect,
mid-search, is indistinguishable from injection at the receiving end** — and
worse, it invites confirmation of a conclusion instead of a search. The narrowing
message should have carried the search *facts* (the date, the repo, the session
window) and withheld the quote.

