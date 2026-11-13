- **2026-07-23 (McDonald's menu, branch cap, menu-page ⋯; then queue-and-close)**:
  More live feedback, worked then wound down at owner's request. **Shipped:**
  (1) **McDonald's menu** — enduring NZ items across 6 sections, `price: null`
  ("varies", not published per-store; no fabrication), status stub →
  menu-complete (+ relinked no-JS fallback). (2) **Multi-location branch cap**
  (`locations.branchesToShow`, 5 tests) — show the **2 nearest within favBoostKm**
  (repurposing that inert dial), rest behind "Show all N branches"; graceful
  fallback to first-two when there are no coords/location. (3) **⋯ app menu on the
  restaurant page** (`menu.topbar` + `initChrome`): Favourites (→ `index.html#faves`,
  new handler in `app.js`), Share, About. **Settings deliberately omitted** — it
  changes allergen prefs `menu.js` reads once at render (safety). **Owner
  confirmed in a fresh browser: the ⋯ menu and the smooth deep-link scroll both
  work.** **⚑ LEARNING (cost real time):** the service worker makes `shift+cmd+r`
  *insufficient* to see changes — only a **fresh browser / full PWA relaunch**
  busts it; and **headless Chrome reuses a persistent default profile with a
  stale SW** unless you pass a fresh `--user-data-dir` (screenshots were
  unreliable until then — proven by a debug style that never appeared). See
  [[faves-headless-testing]]. **Queued for the next session (owner: "queue all,
  new session"):** (a) **McDonald's geocode** → makes the branch cap show the
  actual 2 *nearest* sorted closest-first (today it shows town branches for lack
  of coords) + Near-me; (b) **self-host McDonald's photos** (owner accepted the
  IP risk); (c) **branches aside scrolls with the menu** — drop `position:sticky`
  on `.menu-aside` (drafted + reverted per "queue it"); (d) **Settings on the
  menu page** — owner wants it; needs the allergen-reactivity wiring first. All
  in ROADMAP Theme 2 / owner-rulings. SW SHELL → .86. Parallel-session discipline
  held. Verify: `node --test` 283 pass, `validate.py` 28 files valid,
  `check_no_deps.py`, SBOM; tree clean, all pushed.

