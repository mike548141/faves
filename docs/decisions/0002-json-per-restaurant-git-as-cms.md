# 0002 — One JSON file per restaurant, git as the CMS

**Status**: accepted • **Date**: 2026-07-08 (backfilled; decided at Phase 0)

## Context

The menus need a content store. Curation is deliberately ours (the repo
is private; the site is public), and an admin UI, user accounts, and
live menu sync are all explicit non-goals (see `STRATEGY.md`). The data
is a few dozen kilobytes of text that changes by hand, occasionally.

## Decision

One JSON file per restaurant under `site/data/restaurants/<id>.json`,
with `site/data/index.json` holding the display order as an array of
ids. Git is the CMS: history, review, rollback, and blame come free.
`tools/validate.py` (stdlib only) enforces the schema so a typo fails on
the laptop, not in a guest's browser.

## Rejected

- **A database (SQLite/Postgres/Firestore):** a server and operational
  surface for kilobytes of text that changes by hand. Nothing to gain,
  a backup/migration/uptime burden to carry.
- **A headless CMS (Contentful, Sanity, Strapi):** an external
  dependency, auth, and cost — and it breaks the "adding a place is a
  data task in the repo" property and the offline/privacy stance.
- **One big `menus.json`:** worse diffs and needless merge conflicts;
  per-file keeps each change small and reviewable, and makes "add a
  restaurant" a single new file.

## Consequences

Adding a restaurant = add one file + one id in `index.json` (+ the no-JS
fallback `<li>`; see the lockstep rules in `CLAUDE.md`). Editorial review
*is* pull-request review. The site fetches all files client-side and the
service worker precaches them. `picks` are validated to match a real
menu item name exactly, so the "our picks" block can never dangle. Flows
from [0001](0001-zero-build-vanilla.md).
