## 2026-08-16 01:20 UTC — the collection stops being Wellington's

**Ask.** Owner: parts of the app and repo scope faves to Wellington, "which is
not my intent — I might add places from anywhere in the world that I like."

**What was actually scoped.** Nine strings in the product's own voice: the
`<title>` and `og:title`, the manifest `name` and `description`, the two meta
descriptions, the home subtitle, `restaurant.html`'s `og:description`, the About
lede, the share text, and the te reo `app.sub` (*"o Pōneke"*). Plus README and
CONTRIBUTING. All now name no city and no country. ADR 0042 records the call so
a future session doesn't restore it as description.

**Left alone deliberately.** Venue data (real areas, addresses, coordinates —
that is a fact about a place, not a scope); `index.html`'s no-JS fallback cards
which mirror it; CHANGELOG and session history, which are records of their own
moment; and ADRs 0006/0029/0035, which *illustrate* with Wellington. An example
is not a boundary.

**The part that isn't copy.** The rename exposed three behaviours still
hard-coded to NZ, each correct for every venue held as at 2026-08-16 and
**silently wrong** for the first one outside it — a confident wrong answer, not
a blank: the `Pacific/Auckland` clock behind open/closed (ADR 0006), NZD by
construction (ADR 0037's single site-wide statement plus `price.js`'s bands),
and `summer` = Dec–Feb. Not fixed here — the timezone one alters the schema,
migrates 38 files and supersedes an accepted ADR, which is a different change
from renaming strings, and none of it is needed until a venue actually arrives
from somewhere else. Marked at the source with `#!####`/`#!###` and carried into
ROADMAP Theme 20, with the timezone item flagged as a **prerequisite** to that
first non-NZ venue rather than a follow-up.

**Verification.** `validate.py` 38 files 0 errors; `test_validate` 21/21;
no-deps, SBOM, visibility clean; `node --test` **545**; `device_check` **19**.
`SHELL_VERSION` → `2026-08-16.1` (shell only — no data changed).

