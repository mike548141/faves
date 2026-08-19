- [x] 🚩 **A browser check that names an element by id is only as durable as
      that element — sweep all twelve** `[M][ci]`. Handed over 2026-08-17 by
      `faves-ea` at its session close, deliberately **flagged rather than
      half-started**, because it is fresh work across twelve tools rather than a
      tidy-up of anything already in flight. Unclaimed.
      🔎 **The concrete instance, which is worth more than the principle.**
      [ADR 0083] removed the `#geo-ask` location pill on the owner's word.
      `tools/filter_row_check.mjs` drove that id directly and **crashed on a
      null** the moment it went — `Cannot set properties of null (setting
      'hidden')`, mid-run, no summary line. One line to fix once seen.
      🔑 **That is the LOUD version, and it is the good one.** The silent
      version is a check that keeps *passing* against an element that no longer
      exists — green, meaningless, and indistinguishable from working. That is
      exactly the decorative-guard fault [ADR 0072] names, wearing yet another
      hat: the guard still runs, still reports, and no longer refers to
      anything. `sync_check` sitting dead through a whole settings refactor is
      the same disease.
      **What the sweep is:** across all twelve browser checks, find every
      assertion that reaches for a specific `id` or class, and decide for each
      whether a *missing* target should fail loudly or is a legitimate absence.
      🎯 **The judgement to make, per assertion, not globally:** an id that
      vanishes because a feature was removed should make the check fail with a
      sentence naming what it wanted — not throw, and not quietly pass. The
      question a retarget must answer first is whether the assertion's
      *question* is still live: `filter_row_check`'s was ("can something above
      own the pixels a tap would land on"), so it was pointed at `#geo-banner`
      rather than deleted. Where the question died with the element, delete the
      assertion — a check kept for an intent nobody holds any more is the same
      fault from the other end.
      🚩 **WIDEN IT TO COMMENTS AND PROSE — measured 2026-08-17, hours after
      this item was filed.** Asked to prove the session was ready to close, a
      sweep for `geo-ask` found **three** live references to the deleted pill
      that no gate sees, because none of them is code:
      `site/css/app.css` still said the ask *"reuses the single-chip
      `.list-toggle` look"* (the exact thing [ADR 0083] deliberately stopped
      doing — a permission must not read as a filter you can flip off), an
      `index.html` comment inside the retired Sort By block still pointed at it,
      and — the real one — **`docs/ARCHITECTURE.md`, the compact current-truth
      document, still described the whole location flow in terms of a button
      that no longer exists.** Every clause of that paragraph was false.
      🔑 **The gates cannot help here and it is worth being precise about why:**
      `linkscan` reads links, `pathscan` reads paths, `plainscan` reads prose
      style. **Nothing reads a CSS selector or an element id mentioned inside a
      comment**, so a comment naming a deleted element is invisible to every
      enforced check while sitting directly beside the code it misdescribes —
      which is where the next reader will trust it most. So the sweep is
      `grep` for every `#id` and `.class` named in a comment or a doc, not only
      those named in an assertion.
      ⚑ **Related but distinct, so do not merge them:** the CI item above is
      about which checks *run*; this is about whether a check that runs still
      *refers to anything*. A check can pass both and still be worthless.

      ✅ **SWEPT AND CLOSED 2026-08-19 — and ALL FOUR named instances were
      already repaired.** Reported as refutations, because a findings list is
      evidence and not a work order: `filter_row_check` already carries a
      `RETARGETED 2026-08-17` comment and drives `#geo-banner`; `app.css:299`
      already names ADR 0083's removal; `index.html:845` already marks its
      mention historical; and `docs/ARCHITECTURE.md` lines 737–753 already
      describe `#geo-dialog`/`#geo-banner`, every clause checked against ADR
      0083 and `site/js/app.js` and every clause true. The claim that *"every
      clause of that paragraph was false"* had stopped being true before anyone
      acted on it.
      **The systematic half found nothing stale either:** 124 distinct
      `#id`/`.class` targets across the 13 tools plus 16 driver selectors,
      every one tested for a real definition in `site/`. **Zero stale.** Four
      apparent misses were all legitimate — two deliberate ABSENCE assertions
      (`#geo-ask` in `geo_check`, `.about-versions` in `boot_check`), one
      self-injected id, one tolerant OR-list alternative.
      ✅ **What shipped is the DURABILITY half, and its value was the exit
      code.** `need()` + `MissingElementError` (`tools/lib/browser.mjs`) now
      route **26** dereference sites across 9 tools. Measured both ways: a raw
      dereference of a deleted element gives `TypeError: Cannot set properties
      of null` at **exit 2** — this repo's code for *"the browser stopped
      answering, nothing here says anything about the site"* — while `need()`
      gives `FAIL MISSING ELEMENT — this check wanted #geo-ask, and nothing on
      the page matches it` at **exit 1**. 🔑 **A real site regression was
      arriving dressed as a transport flake**, which is the
      flake-impersonates-a-regression fault running backwards. Break-probed
      independently before merge on `#geo-banner-DELETED`.
      🚩 **Residuals are filed as their own items** (`130`, `140`) rather than
      left in this one: `until()` timeouts still exit 2, and a tolerant OR-list
      selector can pass with every named target gone. **⚠️ Unverified and said
      plainly:** the "no stale targets" result rests on regex extraction of
      selector literals — a selector assembled at runtime from a variable would
      not have been caught, none was seen, and their absence was not proven.
      Any future id-existence gate must also read `site/data/`, because
      `#section-<id>` anchors come from `sectionId` in the venue JSON.
