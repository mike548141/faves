# 0137 — A field a future screen will render may ship before that screen

**Status:** accepted
**Date:** 2026-09-28
**Amends:** [0047](0047-the-app-ships-only-what-it-renders.md). Its test,
*"before adding a field to a venue file, name the screen that renders it"*,
gains the half of the owner's ruling that 0047's own Consequences and
`CLAUDE.md`'s restatement dropped. The split itself is unchanged: superseded
prices and departed dishes still live in `data/`, and `split_data.py --check`
still guards the move.
**Owed since 2026-08-16.** Measured 2026-09-09 (roadmap `110/020`): 33 inbound
references to 0047 and no amending record.

## Context

0047's **Context** records the ruling correctly: data the app will never render
*"now or in a future feature"* stays out of the payload. Its **Consequences**
(*"The payload can only grow by adding something a screen shows"*) and
`CLAUDE.md` (*"name the screen that renders it"*) both leave out the future
clause. So two of the three places a builder looks are narrower than the
decision.

It cost something on the first field it touched. On 2026-08-16 a peer put the
trace tier to the owner as a 0047 breach, and he overruled the premise:

> *"In ruling 47 I said it only holds data the screen shows, **or may with
> future features**."* (`docs/SESSIONS.md`, 2026-08-16 15:40 UTC session)

He ruled that trace lives in `site/data/`, unrendered for now. The item never
recorded it. On 2026-09-09 a session asked the same question again, and he gave
the same answer.

## Decision

**0047's test reads: name the screen that renders the field, or the future
feature the owner has ruled will render it.** The second arm is narrow:

- **The owner names the feature, never a session.** "Might be useful one day"
  is the accretion 0047 exists to stop. An owner ruling that a named feature
  will render it is a different thing.
- **The record says so where the field is defined**, in its ADR and the
  ARCHITECTURE schema, so a cold review finds the reason next to the field.
  Without that it would correctly report the field as a breach.
- **It is an exception with an owner, not a class.** The next such field needs
  its own ruling.

## The one field it has covered, and its state now

The trace tier (`trace` / `traceSource`, [0136](0136-may-contain-is-a-trace-tier-never-a-tag.md)).
It was ruled onto the payload on 2026-08-16 with no screen, and it now has
two: the "May contain traces of …" line in every tag tip on the dish, and the
"May contain …" chip for a reader who flagged that allergen. So today it passes
0047's original test as well. This record exists for the next field, and so the
reasoning behind the 2026-08-16 ruling survives.

Measured cost when it shipped: +22 bytes gzipped on the one collection that
carries it. The per-venue cost owed by 110/020 gets measured when a first-party
chart (Pizza Hut) is transcribed, because no venue carries one yet.

## Advice (for the owner, on the record)

The session that put this to him on 2026-09-09 recommended the record store
(`data/`), and he overruled it. His reason holds: one dish's allergen facts in
one place means a refresh cannot update one store and forget the other, on
safety data. The cost of the future clause is that it weakens 0047's strongest
property, a test anyone can apply without asking. Keeping the arm owner-only is
what holds that cost down.
