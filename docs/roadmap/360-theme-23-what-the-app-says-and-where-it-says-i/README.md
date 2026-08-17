# Theme 23 — what the app says, and where it says it (owner-raised 2026-08-16)

Owner, on the About dialog: *"looks like a dumping ground of information. Look
at why the info is there (e.g. the action/request/research that triggered the
work to create it) and find a better way… Consider what the right home is for
all this information, could be the about screen or somewhere else, and what
prose should be used for a consistent voice throughout Faves."*

**The diagnosis he is pointing at.** About is not a screen anyone designed; it
is a sediment. Each block was added by the item that needed somewhere to put
it — privacy by the no-tracking work, the currency line by ADR 0043, the
"how we read this menu" line by ADR 0036, the version rows by ROADMAP 16f /
ADR 0032, the update-ready line by the PWA refresh work. Every block was right
*at the time*; nobody has since asked whether About is where a reader would
look for it. That is why it reads as a list of answers to questions nobody
asked on this screen.

- ✅ **Delivered 2026-08-16 — the version caption sat in the wrong place.**
  The owner's worked example: *"why is the text 'What this page is currently
  running.' underneath the version numbers rather than under the heading"*. It
  now sits directly under the **Version** heading, before the numbers —
  heading → prose → detail, the order every other group in the dialog already
  used — and at body size rather than the 0.85rem that made it read as a stray
  footnote. `about-ui.js` + `app.css`.

- ✅ **23a and 23c — DELIVERED 2026-08-16.** The version stamps and the
  "an update is ready" state moved out of About into Settings → **Refresh &
  reset**, beside the *Refresh now* button that acts on them — one outcome
  ("am I up to date, and if not, fix it") on one screen instead of two. About is
  now the lede plus *Private by design* and *Works offline*, and fits one screen
  at 390 px. Opening hours went entirely: `app.js`'s `timezoneNote()` and
  `menu.js`'s "Hours · NZ time" both state the clock rule, and both state it only
  when the viewer's clock differs — About told everyone, always, about a
  situation most readers are not in.
  🔑 **23a's delete case for Prices was only 29% true, and deleting it as written
  would have destroyed a fact.** The roadmap said the ⓘ beside a menu's prices
  already names the currency. It does — **in the blue tone only.** Applying
  `refreshCaveat`'s own rules to the corpus, **39 of 55 venues sit in the amber
  tone**, whose text never mentions currency. So for most of the corpus About was
  the *sole* statement of it. The rehoming was done by closing the amber gap
  first and only then deleting About's copy, so the fact is now stated in more
  places than before, not fewer. **A duplication claim is a measurement, not a
  reading** — this one was checked against the corpus and came back the other way.
  🎯 **[ADR 0037] §3 now needs superseding.** It decided currency is *"stated
  twice, in the two places it is asked about — the per-venue ⓘ, and the About
  dialog."* The build implements *stated once, where it is asked*.
  `docs/ARCHITECTURE.md` is amended; the ADR is not, because an accepted record
  is superseded and never edited. **Owner call, recorded in `SESSIONS.md`.**
  🚩 A once-at-boot read would have been wrong: About built its dialog lazily and
  asked the service worker when the reader asked, while Settings is built at
  boot — on a first visit no worker controls the page yet, so the panel would
  have said *"not yet serving this page"* for the whole session. An `onOpen`
  hook fixes it and `boot_check` fails without it.
  🚩 Pre-existing and NOT introduced here: closing About restores focus to
  `<body>` rather than the opener, because the overflow menu that opened it has
  already closed. Worth its own item.
  `boot_check.mjs` now asserts About's group list **by name**, so the sediment
  this theme is about cannot re-form silently. Original framing below.

- ✅ **23d — the restaurant cards are getting busy — DELIVERED 2026-08-16.**
  The owner returned with a spec rather than leaving it open: drop the
  service line, move the open/closed badge up beside the suburb with a
  traffic-light dot, keep cuisine and the per-person estimate, and show the
  *nearest* branch for a multi-branch venue with that branch's own hours. All
  shipped. The branch half was the substantive one — `venueHours` already
  followed the nearest branch while the suburb came from the venue's top
  level, so one branch's hours could sit under another's name. Branches carry
  `label`, not `area`; reading `area` was a silent no-op caught only by
  checking the real corpus. What remains open from the original framing is the
  narrower question below, kept because it was never answered: whether `$$`
  *and* `~$16pp` are two answers to one question, and whether three cuisine
  chips beat one plus a count.

  Original framing, kept for the open part. Owner, 2026-08-16:
  each listing now carries name, suburb, services, open state and closing
  time, price band, per-person estimate and up to three cuisines — *"consider
  what is valuable to show on this page and what should be scaled based on
  screen size to hide or show info."* Two questions, and they are different:
  **which facts earn a place at all** (is `$$` *and* `~$16pp` two answers to
  one question? do three cuisine chips help, or would one plus the count?),
  and **which survive a narrow screen**. Note the existing responsive load —
  at 390 px the cards are already one column, so the busyness is per-card, not
  layout. Anything hidden at small sizes must still be **findable**: the
  searchable surface now indexes services and cuisine (2026-08-16), so hiding
  a chip no longer hides the fact. Judge against the card's job — *choose
  somewhere to eat* — not against completeness.

- ✅ **23e — the venue subheading was a dead end — DELIVERED 2026-08-16.**
  Owner, raw: *"In the sub heading that says 'Asian · Malaysian · Noodles —
  Johnsonville' I should be able to click on things like the word Malaysian or
  Johnsonville and jump to a search/filtered list of the restaurants that meet
  that criteria."* Every facet in that line is now a link into the home list
  filtered to it, carried as `index.html?cuisine=…` / `?area=…`; the dropdowns
  are set from the URL and the URL is rewritten as they change, so control and
  list can't disagree, and a filtered list is shareable. `filters.js` owns both
  ends (`filterHref` / `filtersFromQuery`), and an unknown value falls back to
  "all" rather than silently emptying the list under a control saying otherwise.
  🔎 **The adjacent one that doesn't work the same way** — the *cards* on the
  home screen carry cuisine chips too, but each card is already one big `<a>`,
  and a link inside a link is invalid HTML. Making those chips filter needs the
  card's hit area restructured (23d territory), so it is left for whoever takes
  23d rather than bolted on here.

- **23b — one voice, written down** `[S→M]` 🎯. There is no tone guide, so the
  voice drifts between blocks — some prose addresses "you", some describes the
  system, some is caption-shaped. Write the guide (plain New Zealand English,
  second person, no jargon, say the limit honestly rather than hedging — the
  voice the menu caveats already use well), then apply it. This is also where
  the **te reo** strings live: the rotating search hints landed on 2026-08-16
  untranslated by design, so `search.hint.*` is owed against the owner's
  nominated dictionary. Keep the guide short enough that it gets read.
