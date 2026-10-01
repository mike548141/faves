- [x] **Find the "chatty" parts of the app, and what each would save**
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

  ✅ **Survey done 2026-10-01 (`faves-55`, worker `510-130`):**
  [the chatty-app survey](../../reviews/2026-10-01-0418-chatty-app-survey.md).
  Top three: sync spends 9 KV reads a pull and 26 a heart even with no
  recipes; one rating re-renders all 264 dishes (~600 ms at 4x CPU); a first
  visit downloads ~40% of the app twice. Twelve fix items proposed, A to L.

  ✅ **Closed 2026-10-01 (`faves-55`):** the fixes are filed as `140`–`250`.
  Four of them need a ruling (`160`, `170`, `180`, `240`), and `220` needs a
  design ruling.
