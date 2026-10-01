- [~] **Find the "chatty" parts of the app, and what each would save**
      `[M] [perf][sync][pwa]` — owner-raised 2026-10-01 (session
      `faves-55`): *"we should look at what parts of the app code are
      "chatty" and could be made more efficent"*.

  **Read as:** an inventory, measured rather than guessed, of every place
  the app talks more than its job needs. That covers network requests (page
  loads, the service worker's update and recheck fetches, sync GETs and
  PUTs, beacons), server writes (each KV write counts against the free
  1,000 a day), and the work the device does on itself (repeated
  `localStorage` reads and writes, `storage`-event repaints across tabs,
  timers and polling). For each one: what triggers it, how often, its
  measured cost, and the cheaper shape with its saving. Fixes are filed as
  their own items, each with the four costs; this item builds nothing.

  📌 **Claimed 2026-10-01 (`faves-55`)** for the survey.
