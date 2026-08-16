# 0046 — Ownership is recorded, bounded by provenance

**Status:** accepted
**Date:** 2026-08-16
**Amends:** the *No personal data* hard constraint in
[`CLAUDE.md`](../../CLAUDE.md) — the blanket prohibition becomes a bounded
permission with a mandatory source

## Context

The owner asked (2026-08-16) to record who owns each venue, and to be able to
see where one person or company owns several of them — a company, its
directors and its shareholders, and the contact details needed to reach them.
Not to display in Faves: a reference dataset, held the same way price history
is held.

That collided with a hard constraint. `CLAUDE.md` said: *no addresses of
people, no phone/contact details, no health details, anywhere; for restaurants
and menus, no personal data at all* — with one owner-approved exception for
family attributions on home recipes. This repo has been **public since
2026-08-09**, and a push is publication: git history is published too, so a
record removed later remains disclosed.

The collision was put to the owner in full before he ruled — the public
visibility, the irreversibility of history, and that a public register being
open is not the same as a derived dataset being republished in an indexable,
cloneable repo outside that register's own access path. He ruled with that
account in hand.

## Decision

**The owner's ruling, 2026-08-16:** ownership and contact information may be
recorded in the repo and linked to venues, bounded by **provenance**. Only two
origins qualify:

| `source.kind` | Means |
|---|---|
| `public-record` | Published by an authoritative public register (Companies Office, NZBN) |
| `given` | The person or organisation purposely gave it to us for use in Faves |

The permitted fields are **name, email and phone** — enough to contact a person
or an organisation. Ownership may run through companies, trusts, partnerships
or natural persons, and the graph is entity-to-entity as well as
entity-to-venue, so a holding company that owns four venues is one record.

**Provenance is mandatory and enforced, not documented.** Every person record
and every contact detail carries `source` with a `kind`, a `recorded` date, and
a `ref` specific enough to re-check. `tools/registry.py` **errors** on a record
that cannot say where it came from; it does not warn. A permission whose bound
is only written down is not bounded — the check is what makes the ruling real.

**It lives in `data/`, never in `site/`** — the research store of
[ADR 0047](0047-the-app-ships-only-what-it-renders.md). None of it is served,
precached, or reachable from the app, and no file under `site/` refers to it.
The graph keys on the venue `id` from the record side only, so the payload gains
nothing and needs no migration.

**Deliberately outside the ruling**, and therefore not collected: home addresses
of natural persons, dates of birth, and anything about a person's health or
finances beyond the shareholding a public register already states. The ruling
named name, email and phone. Widening it is the owner's call, not a session's
assumption — a registered office belongs to a company and is fine; a director's
home address is not.

## Rejected

**Entity-only — companies and NZBNs, chains terminating at "natural person, not
recorded".** This was the recommendation put to the owner. It answers the
multi-venue question in most real cases, because holding companies are common,
and it puts no person into a public repo. He ruled against it: he wants the
contact details, and provenance is the bound he chose instead of omission.

**Person layer in the private estate root, entity graph here.** Matches the
existing doctrine boundary and would have kept the public repo clean. Rejected
by the owner in the same ruling — it splits one dataset across two repos, and
the provenance bound already limits the holding to material that is either
public or volunteered.

**Record it without a provenance field, and rely on discipline.** Rejected
here, not by the owner: the ruling's entire content is *which* information may
be held, so a record that cannot state its origin cannot be shown to satisfy
it. Unenforced, the bound would decay into "whatever someone found", which is
the thing the ruling excludes.

## Consequences

- A named person can now appear in this public repo, under a check that says
  why they may. That is a real widening of what this repo publishes, taken
  deliberately and recorded here so a future session does not treat it as drift.
- The `CLAUDE.md` constraint changes from *no personal data* to *no personal
  data except under ADR 0046's provenance rule*, keeping the absolute
  prohibitions (health, home addresses of people) intact.
- "Who owns more than one of these" becomes a query rather than a memory —
  `tools/registry.py --common` walks the graph.
- **Nothing is populated by this decision.** The store, schema and checks land
  empty. Ownership facts are research: inventing one about a real business
  would be both wrong and a claim beyond its evidence, so the records get
  written when the register is actually read.
