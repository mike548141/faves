## 2026-08-16 09:17 UTC — a URL for every section, and an ⓘ that fought the pointer

Two owner items, taken in the shared `main` checkout alongside three other live
sessions. Both are closed; nothing is left staged.

### Theme 34 — every section addressable by URL (design only)

The owner asked that sections, and perhaps individual settings, be reachable by
link: *"I should be able to send someone a URL and it opens straight to the Food
Preferences section."* Too big to build in one pass, so it went to the roadmap
with a designed shape rather than a stub.

**The finding that shaped it.** The hash is already full. Three mechanisms share
it with no rule deciding precedence: an element anchor (`#dish-<slug>`), a view
toggle (`#faves`), and two opaque payloads (share and transfer tokens, consumed
then stripped). `#faves` is a bare word in the same namespace as a dish slug.
Adding `#settings/diet` to that without a convention is how a venue that one day
sells a dish called "faves" breaks the favourites view. Hence 34a — the
convention and one owner for it — before anything else. Recommendation put to
the owner: **query for state, hash stays for anchors and payloads**.

The owner's own example turns out to be the cheap part: `settings-ui.js` already
carries stable topic keys (`people`, `diet`, `places`, `locale`, `data`,
`refreshReset`), so "Food preferences" is `diet` and 34b is `[S]` once 34a
exists. The expensive part is 34d — per-*item* addressing — which needs a
registry of settings with labels and synonyms. That is the same registry Theme
22a named as its missing piece, so the two are now linked: build it once.

**The item that decides whether the theme works at all** is 34e. An installed
PWA in standalone mode has no address bar, so on the very devices Faves is built
for, there is currently no way to *obtain* the link the owner wants to send.
Plumbing without it delivers nothing.

### The allergen ⓘ flicker — one CSS rule, and a rule about rules

Reported from the live site: hovering the ⓘ beside "Allergens to flag" made the
note flash on and off in a loop. Reproduced in headless Chrome and **measured**:
the ⓘ travelled **54 px** (top 453 → 399) under a pointer that never moved.

The mechanism is two safe decisions meeting. The note is a `position: absolute`
popover everywhere — safe to hover-reveal, because it overlays and moves
nothing. But inside the settings dialog it was made `position: static` earlier
today, so the sheet's scroll box could not clip it; there it is *in flow*. The
sheet is `margin: auto`, so it grows in both directions. Reveal → sheet grows →
ⓘ rises out from under the pointer → un-hover → note hides → sheet shrinks → ⓘ
returns → re-hover. Pure CSS, no JavaScript involved, and invisible to all four
headless harnesses because none of them hovers anything.

Fixed by making that one ⓘ click-only — which is what touch and keyboard already
used — with the general rule written at the rule itself: **a hover reveal must
never move the thing being hovered.** Verified by the repro: eight samples, one
state, and the click toggle still opens the note.

**The sweep the owner asked for came back clean, with evidence rather than
assurance.** Exactly one hover-reveal combinator exists in the stylesheet; there
are no JS hover handlers anywhere in `site/js/`; every other `:hover` rule
changes only `transform` (1–3 px, or a scale that *grows* under the pointer),
which does not reflow. One instance, now fixed.

### Found on the way, and deliberately not fixed

`disclosure()`'s **hover** path fails WCAG 2.2 SC 1.4.13 — not Hoverable (the
note vanishes when you move toward it, across a `margin-top` gap) and not
Dismissible (Escape is only wired on the *click* path). Its click path passes.
Filed as **15y** with three options and a recommendation, rather than fixed in
the same commit: the cheapest fix changes a shipped component's visible box, and
that is the owner's call. Logged because a defect found and left unrecorded is
the same as a defect not found.

### Concurrency, honestly

Work was done in the shared `main` checkout, not a worktree — which is how a
peer session came to find my staged changes and have to ask whose they were.
A rebase then collided on `sw.js`, and the naive resolution (`origin/main` + 1)
would have taken a `SHELL_VERSION` a sibling had already spoken for. Corrected
to `.50` from the peers' allocation before pushing. **The version collision this
repo has now lost three times is caused by reading `origin/main` and adding
one**; the fix that works is asking, out loud, which numbers are spent.

