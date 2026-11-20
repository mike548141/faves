- **2026-07-08 (add two pizza venues: Hell Pizza Newlands + Pizza Hut
  Johnsonville)**: Owner asked to add "Hell Pizza, Newlands" and "Pizza Hutt
  in Johnsonville". The latter resolves to the chain **Pizza Hut** (every
  source is the chain; "Hutt" read as a typo — flagged to owner). Added both
  as `status: "stub"` venues (menus still to capture) following the
  add-a-restaurant checklist: new `hell-pizza-newlands.json` +
  `pizza-hut-johnsonville.json`, both ids appended to `index.json`, matching
  "Menu coming soon" fallback `<li>`s in `index.html`. Facts web-researched
  (address/phone/hours) and coordinates geocoded dev-time via Nominatim:
  Hell = 225 Newlands Road (-41.22360, 174.82280), phone +64 4 478 6007, <!-- leakscan:allow: venue business address/phone/coords quoted in a session record — same product class as site/data (ADR 0022 gate 1) -->
  per-day hours (Mon/Tue/Wed evening-only, Thu–Sun from 11:30); Pizza Hut =
  88 Johnsonville Road (-41.22500, 174.80730), phone +64 4 478 8927 <!-- leakscan:allow: venue business address/phone/coords quoted in a session record — same product class as site/data (ADR 0022 gate 1) -->
  (sources conflicted — one gave 04 478 9999; verify), 11:00–23:00 Sun–Thu, <!-- leakscan:allow: venue business phone quoted in a session record — same product class as site/data (ADR 0022 gate 1) -->
  Fri/Sat late (null close per ADR 0006). Both `cuisine:["Pizza"]`,
  `services:["takeaway"]`, `verified:null` (needs in-store confirmation like
  the other stubs). Cards aren't links (stubs), so no menu page / ordering
  buttons yet; hours drive "open now" and coords drive distance. SW derives
  precache from index.json, so no SHELL edit — just VERSION → 2026-07-08.22.
  Browser-verified via CDP at 390 px: both cards render (26 total), correct
  area + "Takeaway" + "Menu coming soon", no console errors (null-close hours
  parsed cleanly). validate.py 24→26 files valid; check_no_deps clean.
  CHANGELOG updated. Owner granted standing push authorisation this session.
