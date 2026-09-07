- [~] 🎯 **Simmer, Churton Park — owner-supplied menu photos** `[S][content]`
      🔒 **CLAIMED 2026-09-07 (session faves-b1).**
      Owner, mid-session: *"I've just added photos for simmer's menu"* — four
      JPEGs in `intake/menus/Simmer Cafe/`, timestamped 14:16 on 2026-09-07.

  🔑 **This is the menu-content rule's FIRST limb, not its second.** The rule is
  *"whatever food/dishes I give you are to be included"* — owner-**supplied**,
  which needs no further direction and no scoping argument. Contrast the
  thirteen-stub sweep in [`190`](190-the-stub-sweep-missed-a-fetchable-menu.md),
  which needed an explicit fetch instruction because nobody had handed anything
  over.

  🔎 **It answers a verdict this session had just recorded, and the answer is
  "correct, and irrelevant".** `190`'s sweep, run hours earlier, put Simmer in
  the not-fetchable column: *"no site of their own could be found under any
  spelling … behind a login past its first screen. Nothing readable was
  published."* That verdict stands — Simmer still publishes nothing. **A venue
  that publishes no menu is not a venue with no menu.** The sweep measured what
  is *on the web*, which is a different question from what exists, and the
  owner walking in with a camera is the difference. Worth stating because the
  same confusion is what made `150`'s "not one is fetchable" sentence read as
  "there is nothing to get".

  **Where the record starts.** `simmer` is a `stub` carrying name, cuisine, area,
  address, coordinates, phone, per-day hours and `services` — everything except
  a menu. So this is a flesh-out, and on success it moves `stub` →
  `menu-complete`, which means its no-JS fallback `<li>` must gain a link
  (`tools/check_fallback.py` enforces it; nine venues once shipped as unreachable
  "Menu coming soon" cards with finished menus behind them).

  🚩 **Read the photos, do not infer from the filenames.** `IMG_7255`–`IMG_7258`
  say nothing about which board or page each carries, and consecutive numbers
  need not be consecutive pages. Any price or dish that cannot be read
  confidently is **not transcribed** — the corpus's standing rule, and the
  Dragonfly and five-stub fetches both recorded refusals rather than guesses.
