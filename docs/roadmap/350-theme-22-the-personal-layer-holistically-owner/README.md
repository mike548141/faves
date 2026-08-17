# Theme 22 — the personal layer, holistically (owner-raised 2026-08-16)

Three items raised while the owner browsed the live site. They are filed
together because they are **one problem seen from three angles**: Faves has
grown a personal layer — favourites, ratings, profiles, transfer, sync — and
each capability arrived with its own button in its own place. The owner's
framing, verbatim: *"not buttons scattered all over the app"*, and the standing
bar, *"Faves MUST have the best UX, it must be intuitive (natural, easy), look
great, fast"*.

**Sequencing matters here and is not obvious.** 22c settles *what the model
is*; 22b settles *what the screen is*. Doing 22b first means moving the same
share button twice — so 22c's model call comes first, or at least alongside.
22a is independent and can go any time.

✅ **RULED 2026-08-17 — 22b and 22c are ONE piece of work, not a sequence.**
The owner was offered all three shapes (22c first · 22b first · both together)
and took **both together**: the Favourites screen is designed *against* the new
personal-data model in a single pass. This **supersedes the paragraph above** —
"22c first, or at least alongside" was written here and never ratified, and the
ruling picks the "alongside" half of it and makes it binding.
🔑 **What the ruling buys, and what it costs.** It buys zero rework: no control
gets placed under today's model and moved under tomorrow's, which is the exact
waste the paragraph above was worried about. It costs **shipping latency** —
22c is `[L]`, so the Favourites screen goes on stranding people for the whole
duration rather than getting a cheap early fix. The owner was told that plainly
and chose it anyway, so **do not "helpfully" ship a 22b patch first**: a partial
fix is the one outcome the ruling rejects.
🚩 **Consequence for whoever takes it:** this is now a single `[L]` item, not an
`[M]` plus an `[L]`, and it does not fit a short session. Claim it as one unit
or leave it. 22a is untouched by the ruling and remains independent.

- **22a — search jumps to a setting or an action** `[M]`. The searchable
  surface was widened on 2026-08-16 (streets, services, phones, diets, plus a
  rotating placeholder that advertises them). The half deliberately **not**
  built is a **third result kind**: typing "map app" or "dark mode" should
  offer the setting itself, not a restaurant. That needs things the app does
  not have — a registry of settings with searchable labels and synonyms, a
  deep-link that opens Settings *at* a panel (`settings-ui.js` owns index and
  panels, ADR 0025), a result group that is visually a *verb* not a place, and
  a11y for a list whose rows now do two different things. Worth a session on
  its own. **Constraint carried forward, and it is a safety one:** no synonym
  may ever assert that an allergen is *absent* — "nut free" must keep returning
  nothing. `search.js` states this at the synonym map; the test
  `no synonym asserts the ABSENCE of an allergen` holds it.

- **22b — the Favourites screen strands you** `[M]` 🎯. Owner, 2026-08-16:
  *"It feels like it takes over the page without an obvious transition to it or
  how to get back, and we have repeated ways to navigate back because of it
  which should not be necessary if it was truly an intuitive UX… functional but
  disrupts the UX and leaves you feeling a little stranded."* Confirmed from
  his screenshot: the panel replaces the browse view outright, with **both** a
  "‹ All places" pill *and* the ⋯ menu offering a way back — two exits is the
  symptom, not the cure. The share control is a full-width filled slab, the
  heaviest element on a screen where it is not the point; he judges it *"ugly…
  and I don't think it is necessary"* (see 22c — the button may not survive the
  model call).
  **Research brief, not a chosen design.** Compare at 390 px: a bottom sheet
  that drags over the list and can be dismissed by dragging back; a right-hand
  drawer with a spring transition; an inline filtered state of the *same* list
  (favourites as a filter, not a destination — the cheapest and possibly the
  most intuitive, since it never leaves the page); and a segmented control
  above the list. Judge each on: is the transition legible, is there exactly
  **one** obvious way back, does it survive `prefers-reduced-motion`, does it
  keep focus order sane, and does it still work with search (the two views are
  mutually exclusive today — `app.js` `exitFavourites`). Whatever wins must
  keep the full feature set: per-venue and per-dish hearts, grouping by venue,
  counts, and the existing deep links.

- **22c — one model for a person's data, not buttons** `[L]` 🎯⚑. Owner,
  2026-08-16: take a holistic view of **(a)** a person with several devices
  keeping their data together, and **(b)** a person sharing their data — recipes,
  favourites — with family or a friend. Both already have deep design work:
  **Theme 9** (cross-device sync: transfer links shipped, continual E2E sync
  designed, ADR 0017/0030) and **Theme 10** (sharing with people). What is
  missing is the layer above them — a single coherent story a user can hold in
  their head, and **one place in the UI it lives**, instead of a share button on
  favourites, another in settings, another on a report, another on a recipe.
  The deliverable of this item is that model and its single surface: what is
  *mine*, what is *this device's*, what travels with me, what I hand to someone
  else, and what each of those is called in one consistent vocabulary. Only
  then does 22b know whether Favourites owns a share control at all.
  ⚑ Touches the first standing backend, which is the owner's go (Theme 9 v2).

  🎯 **Owner's verdict on the current answer, 2026-08-16 — the tech is fine,
  the UX is not.** On Settings → Your data: *"is 'Transfer to another device'
  really a good answer for UX or is this a dumping ground of features scattered
  in the app. We definitely want to be able to do this… but this is not a
  natural way to use or implement it. i.e. the tech is probably ok, the UX is
  bad."* That is a **scope ruling**, and it is the most useful sentence in this
  theme: ADR 0030's transfer link, the file export and the file import are not
  to be rebuilt — they are to be **re-fronted**. The panel presents three
  *mechanisms* ("Download my data", "Bring data back in", "Make a transfer
  link") where a person has one *intention*: **I want my stuff on my other
  device.** Nobody sets out to make a transfer link. The same panel also mixes
  in backup, which is a different intention again, under one heading.
  So 22c's deliverable sharpens: express the intentions, not the plumbing —
  something closer to *"Use Faves on another device"* and *"Keep a copy"* as
  two clearly separate jobs, with the link, the file and (later) continual sync
  as **implementations chosen for the user**, not menu items they must
  understand to pick between. Theme 9 v2's continual sync should then slot in
  underneath the *same* front, not arrive as a fourth button — which is exactly
  the trap this item exists to avoid. The vocabulary work above is what stops
  "transfer", "share", "export", "backup" and "sync" all meaning slightly
  different things on different screens.
