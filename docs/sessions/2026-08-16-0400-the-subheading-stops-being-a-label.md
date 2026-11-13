## 2026-08-16 04:00 UTC — the subheading stops being a label

**The ask (owner, raw).** *"In the sub heading that says 'Asian · Malaysian ·
Noodles — Johnsonville' I should be able to click on things like the word
Malaysian or Johnsonville and jump to a search/filtered list of the restaurants
that meet that criteria e.g. all restaurants that serve Malaysian cuisine."*

**What shipped.** Every facet in a venue's subheading is now a link into the
home list, already filtered. The transport is the URL — `index.html?cuisine=
Malaysian`, `?area=Johnsonville` — which was the choice worth making, and it
buys three things a `sessionStorage` hand-off would not: a filtered list is
shareable and bookmarkable, Back works without special-casing, and the whole
thing survives the service worker's offline shell because it is one static page
reading its own query string.

`filters.js` owns both ends — `filterHref` writes the URL, `filtersFromQuery`
reads it — so the two screens cannot drift apart on a param name. Three things
the implementation had to get right:

- **The controls are set from the URL, not just the list.** A list filtered to
  Malaysian above a dropdown reading "All cuisines" is a screen lying about
  itself, and the reader has no way back to the full list.
- **An unknown value means "all", not "nothing".** A `<select>` handed a value
  with no matching `<option>` silently falls back to its first option — so
  `?cuisine=Klingon` (or a cuisine we renamed after someone bookmarked it)
  would empty the list while the control claimed nothing was wrong. Unknown
  values are dropped at the parse boundary.
- **The URL is rewritten as the dropdowns change** (`replaceState`, not
  `pushState`): a stale `?cuisine=` left in the bar would come back on reload
  and re-narrow a list the reader had since widened — and Back should return to
  the menu page they came from, not walk through every dropdown they tried.

Separators (" · ", " — ") stay outside the anchors: punctuation between links,
not part of any link's accessible name. Each link carries an `aria-label`
naming the destination ("Malaysian — see every Malaysian place"), because
"Malaysian" alone doesn't say what following it does. Styled as a dotted
underline going solid and accented on hover/focus — a caption that signals
"there's more here" without turning into a row of blue. Inline links inside a
sentence are the documented exception to the 44 px target rule (WCAG 2.2
SC 2.5.8); the line-height went to 1.7 so the rows don't crowd when the
subheading wraps at 390 px. The recipe collection's subheading is a sentence,
not facets, so it stays plain text.

**The guard, and proof it bites.** `boot_check.mjs` gained the cross-screen
assertion the unit tests structurally cannot make: read the first
`.menu-sub-link`'s real `href` off a rendered menu page, navigate to it, and
assert the home list came back *filtered* ("1 of 45", not "45 places") with the
dropdown set to the same value. Verified by breaking it — renaming the query
param in `filterHref` alone turned both new checks red, and only those two.

**🔎 The adjacent one that can't work the same way.** The home cards carry
cuisine chips too, and the obvious next step is to make those filter as well.
They can't yet: each card is already one big `<a>`, and a link inside a link is
invalid HTML. That needs the card's hit area restructured, which is ROADMAP 23d
territory — recorded there rather than bolted on here.

**Verification.** `node --test` **631** pass; `validate.py` 45 files, 0 errors;
`check_no_deps` / `check_visibility` / `gen_sbom --check` all clean;
`boot_check` **13/13** (was 11), `device_check` **19/19**, `cook_check`
**36/36**; and both screens eyeballed in headless Chrome at 390 px.
`SHELL_VERSION` → 2026-08-16.14.

**Concurrency.** Taken in worktree `wt/facet-links` (`~/worktrees/faves-facets`)
after the owner flagged parallel sessions mid-task; `wt/fx-localisation` was
live at the time and untouched. ⚠️ `SHELL_VERSION` was bumped .13 → .14 against
`main` as it stood — if another branch merges its own bump first, that constant
is the expected conflict, and the resolution is always "deployed + 1", never a
merge of both strings.

**A second owner report, same session — the currency note crowded its control.**
*"The text sits too close to the highlight around the drop down box, close to
overlapping."* The rate-age line under the Currency picker (new this day, from
the FX work) had no top margin, so it butted against the select. The part that
made it look like an overlap is the **focus ring**, which sits 4 px *outside*
the border (2 px outline + 2 px offset) and appears precisely when the reader
has just used the control and is reading the note under it. Every other note in
that panel is preceded by a heading that supplies the gap; this is the only one
that follows its control directly, so the rule is written on the pairing
(`.lang-select + .settings-note`) rather than on the one note — the next note
placed under a select inherits the fix. Measured after: 16 px gap, 12 px clear
of the ring, and eyeballed focused at 390 px.

**Concurrency, how it actually went.** The FX session pushed `main` (a merge
commit, 7 commits) while this work was mid-flight. Rebasing onto it conflicted
in exactly one place — `site/sw.js` — as predicted. Resolved to
`SHELL_VERSION 2026-08-16.14` + `DATA_VERSION 2026-08-16.4`: theirs for data
(they added three venues), deployed-plus-one for the shell.
🚩 **Worth knowing:** their merge changed `app.css`, `index.html` and 15 JS
files but left `SHELL_VERSION` at `.13`, so `main` deployed a new shell under
the old version — installed phones would not have refetched it, and the FX
conversion would not have reached them. This branch's `.14` carries both
changes and fixes that on merge. Re-verified after the rebase against the
combined tree: `node --test` **655**, `validate.py` 48 files 0 errors,
`boot_check` 13/13, `device_check` 19/19, `cook_check` 36/36.

