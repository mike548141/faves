# Personal data Faves holds on purpose: the one list

Faves is a public repo, and a push is publication to the world. This file is the
**only** place that lists the personal data the repo may hold on purpose. If a
piece of personal data is not here, the repo does not hold it, and a session
that finds some has found a breach, not an oversight to document around.

**The list is closed.** In a public repo a personal-data exception is the
principal's alone to grant, in his own words. A session never adds an entry on
its own judgement: it stops, asks him through the question device, and writes his
answer here only when it is a grant. The entries below are the whole list until
he adds to it. This is atelier's rule and shape (its own list is the worked
example); atelier's `pdlistscan` reads this file for any repo whose
`.atelier-floor.json` declares `"visibility": "public"`, as this one does.

**What counts.** Real people's names, contact details and addresses; health,
family and financial detail; identifiers that point at one person. Not counted,
so not listed: invented example people in fixtures and tests, which describe no
one.

**Granted by.** Each entry says how it was granted. *His words* is a quotation
of him. *His call* is a decision he made that a decision record keeps, and
which was a pick from options he was offered, not necessarily his own words.
Neither is an agent's own choice.

**Records.** The record stores (session logs, review verdicts, board items,
decision records) are append-only history. Rewriting history is not remediation
on a public repo, so they may repeat a listed string and may not add an
unlisted one.

## PD1 — ownership and contact records for the people behind a venue

- **Data:** not pinned to a string. The kinds of record are the **name, email and
  phone** of a person or organisation that owns or runs a venue, and the
  ownership edges between them (company, trust, partnership, natural person).
  **Currently unused:** `data/ownership.json` holds `{"edges": []}`, and
  `data/entities/` and `data/people/` do not exist. No person is recorded.
- **Why held:** the owner wants to see where one person or company owns several
  venues, and to be able to contact the people behind them. It is a reference
  dataset in the research store, never shown in Faves. Purpose test: the
  question "who owns more than one of these" cannot be answered from a
  placeholder or a role.
- **Bound:** only what is in the public domain (`source.kind` is `public-record`,
  from an authoritative register such as the Companies Office or NZBN) or was
  purposely given to us for use in Faves (`given`). Every record carries a
  `source` with its kind, a recorded date and a reference specific enough to
  re-check, and `tools/registry.py` errors on one that cannot say where it came
  from. **Never** a home address, a date of birth, or anything about a person's
  health or finances beyond a shareholding a public register already states.
- **Granted by:** his ruling of 2026-08-16, as recorded in
  `docs/decisions/0046-ownership-is-recorded-bounded-by-provenance.md` (the
  record's wording, not a verbatim quotation): *"ownership and contact
  information may be recorded in the repo and linked to venues, bounded by
  **provenance**"*, with name, email and phone as the permitted fields. He ruled
  with the public visibility and the irreversibility of git history put to him
  first. **Re-affirmed 2026-11-24:** asked, in the queue run's close, whether to
  keep the permission now that the store is empty, he picked
  *"Keep the permission (Recommended)"*. That is a pick from the options he was
  offered, not words of his own, so this entry rests on the 2026-08-16 ruling
  and records the pick beside it.
- **May stand in:** `data/ownership.json`, `data/entities/*.json`,
  `data/people/*.json`, and the record stores `docs/decisions/*.md`,
  `docs/sessions/*.md` and `docs/roadmap/**`. Also `tools/test_registry.py`,
  whose invented records (a reserved `.test` address, an all-zero phone number)
  are the registry check's own fixtures and reach nobody. Never `site/`: nothing
  the app serves or precaches may carry it (ADR 0046, ADR 0047).

## Not on the list

**Family attributions in recipe titles and notes** are not a grant. The earlier
owner approval of 2026-07-06 (`CLAUDE.md` § *Hard constraints*, exception 1) is
not carried here. Five such recipes were moved into the owner's private recipes
on 2026-10-01 and left `site/data/`; on 2026-11-24, at his answer, they were
removed from the research store as well (roadmap `340/400`, ADR 0171). One
still-published recipe title carries an initial and is an open question for him
(roadmap `340/410`); until he answers it, it is not an entry here and a session
adds no new attribution of the kind.
