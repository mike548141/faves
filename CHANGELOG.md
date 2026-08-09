# Changelog

Notable changes to Faves, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This is a
curated site, not a released package — versions here are milestones,
not tags. Per-restaurant "verified on" dates in the menu data track
content freshness separately from this file.

## [Unreleased]

### Added
- **A menu now says *how* we checked it, not just when.** The date under a
  restaurant's name reads "Read in store, 7 Aug 2026" or "Read from a paper
  menu, 8 Aug 2026" — because someone standing at the counter and a listing
  copied off a website are not the same evidence, and they used to look
  identical. Six sources are recognised: in store, a paper menu, the venue's
  own site, a phone call, a delivery app, or a third-party listing.
- **Faves now notices new versions by itself.** The app checks for an update
  whenever you come back to it (at most once every few minutes, so it isn't
  chewing through your data), and when there's a newer version it says so with
  a small "A newer version of Faves is ready" banner. Tap Refresh and you're on
  it; tap Not now and it waits — you'll get it next time you open Faves fresh.
  It will never reload the page under you mid-order. Previously the only way to
  pick up new menus was to force-quit the app and open it again.
- **Settings → Your data → "Refresh menus and app"** — the escape hatch for
  when something still looks stale. It throws away the offline copy of the
  menus and app code and downloads the lot again. Your favourites, ratings,
  settings, profiles and order tally aren't touched, and it won't run when
  you're offline (clearing the copy with no connection would leave you with no
  menus at all).
- **Miles and °F, if that's what you read in** — a new Units setting switches
  every distance on screen between kilometres and miles, and swaps the oven
  temperatures in the Cook at Home recipes between °C and °F. Metric stays the
  default. It's a display choice only: nothing you've saved is converted, so
  switching back and forth can't drift your settings, and it's per person, so
  one phone can suit two readers. Recipe quantities (cups, grams, litres) are
  still to come.
- **Tell us what's wrong or missing.** Spotted a price that's moved, a dish
  that's gone, or an allergen we haven't tagged? There's now a small ⚑ on every
  dish and at the foot of each venue's contact card, plus "Suggest or report" in
  the ⋯ menu for a place we're missing or a bug in the app. Because you raise it
  from the dish itself, the message writes itself — it already names the venue,
  the dish, the price we're showing you and when we last checked the menu — so
  nothing has to be explained twice. Add a note if you like, then send it
  straight from the share sheet or copy it into a message. It all works in
  flight mode, and if your phone won't do either the message stays on screen for
  you to copy. **A report is a suggestion, never a change**: nothing you send
  edits a menu, a price or an allergen tag — a person checks it first. Send it
  to whoever shared Faves with you; Faves has no address book of its own.
  (ADR 0028)
- **You can bring your data back in.** Settings → Your data now opens a file you
  downloaded from Faves — on this phone or another one — and shows you what's in
  it before anything changes: who's in the file, how many favourites and
  ratings, and when it was saved. Adding is the normal path and never deletes
  anything; replacing everything is a separate button with its own confirm that
  names the people it's about to remove. Two things it will not decide for you:
  if a file has someone with the same name as a person on this device, it asks
  whether that's the same person rather than guessing, and if their food
  preferences differ it shows both sets side by side and waits — allergen flags
  decide which warnings shout on a menu, so nothing changes there unless you say
  so. (ADR 0030)
- **Transfer your picks to your other device.** Settings → Your data makes a
  link — copy it, send it through the share sheet, or scan the QR code — that
  carries the person browsing (their favourites, ratings and preferences) to
  your other phone or tablet. Opening it there asks the same questions before
  merging. It's a one-off copy, not a sync: change something afterwards and the
  two won't follow each other. Nothing is sent to a server — the picks ride in
  the part of the link your browser never transmits. Big collections make a long
  link that's fine to copy but too much for a QR code, and Faves says so rather
  than showing you a broken one. (ADR 0030)
- **McDonald's now shows up in "what's close"** — four of its five branches
  (Lambton Quay, Bunny Street, Johnsonville, Porirua) gained coordinates, so
  they sort by distance like every other venue and the contact card lists the
  two branches **nearest you** instead of the first two we happened to type in.
  Courtenay Place still has no pin: the map data doesn't hold that street
  number, and we'd rather show no pin than a guessed one, so it opens by
  address search as before.
- **A security contact at `/.well-known/security.txt`** — the standard place a
  researcher looks before reporting a problem. It points at GitHub security
  advisories, which is why it waited for the repo to go public: while the repo
  was private that URL returned a 404, and a dead contact is worse than none.
- **About now shows which version you're on** — the app and the menu data
  separately, since they update independently. The numbers are read from what
  your device has actually stored offline, not from what the code claims, so a
  phone running a stale copy shows the stale stamp — which is the useful answer
  when you're wondering whether you've got the new menus.

### Fixed
- **The order sheet and share sheet titles no longer render in small caps.**
  `.order-head` was defined twice in `app.css` — once as the order/share sheet's
  header bar, once as the menu screen's small uppercase "Order online" label —
  and the later rule won, so sheet titles picked up the label's uppercase,
  shrunk styling. The menu label is now `.order-block-head`; the sheet header
  keeps `.order-head` for the order, share, receive and transfer sheets.

### Changed
- **Chocolate Self-Saucing Pudding is a single mixture again** — it had been
  written up doubled (serves 12, 70 minutes). Now serves 6 and bakes for 35, in
  a 1.5–2 L dish. It still doubles well for a crowd.
- **Allergen warnings now cover the whole menu, not just what venues bothered
  to write down.** Menus almost never mention wheat, dairy, egg or soy, so the
  allergen filter was close to useless for anyone avoiding them — 45 gluten
  tags across a thousand dishes. Faves now works the allergen out from the dish
  itself wherever that's near-certain: a schnitzel means wheat, a latte means
  dairy, satay means peanuts, tempura means both wheat and egg. **542 warnings
  added.** We flag generously on purpose, and the note in Settings says plainly
  that most tags are now ours rather than the venue's. Two things haven't
  changed: no tag still means *not stated* — never "free of it" — and Faves
  will never mark a dish gluten free or dairy free by guesswork, only the
  reverse. (ADR 0025)
- **Clearer section headings on Takeaway @ Churton's menu.** "Curry on Steamed
  Rice with Vegetables" is now simply "Curry on Rice", "Black Bean Sauce with
  Vegetable on Rice" is "Black Bean Dishes", and so on — with what you actually
  get moved into each dish's description, so nothing is lost.

### Fixed
- **Changing a setting on a menu no longer wipes what you were doing.** Flipping
  an allergen preference, or switching to another person, rebuilds the whole
  menu on purpose — that is how the ⚠ warnings re-apply without ever going
  stale — but it used to take your search, your dietary chips and your place on
  the page with it. All three now come back: the search box keeps its text and
  its results, chips you tapped stay tapped, and you land where you were rather
  than at the top. A dietary preference you actually changed still wins over a
  chip you'd toggled by hand, which is the point of changing it. The safety
  re-apply itself is untouched.
- **The "← All restaurants" back-link on a menu page no longer sits indented
  past the rest of the page.** Its top bar is already inset by the page wrapper,
  and the link added the same inset again — so the back-link and the ⋯ button
  both sat 32 px from the edge while every other element sat at 16 px. Measured
  at 390 px before and after; both now line up with the page.
- **Satay dishes now carry a peanut warning, everywhere.** Satay sauce is
  peanut sauce, but only the venues whose menus happened to print the words
  "peanut sauce" were flagged — so a peanut-allergic reader browsing R & S
  Satay Noodle House saw no warning on a single satay dish. All 22 now warn.
- **A hundred missing shellfish warnings added**, across eight venues. The
  same menu could flag Battered Mussel and say nothing about Prawn Cutlet.
  Every prawn, shrimp, squid, scallop, mussel, oyster and crab dish is now
  flagged — including **oyster sauce**, which is a real and easily missed
  shellfish exposure in stir-fries and claypot dishes.
  The allergen note in Settings now says plainly where tags come from: mostly
  what the venue stated, plus a few we add where the dish name makes it
  near-certain. As ever, no tag still means *not stated* — never "free of it".
  (ADR 0024)

### Changed
- **Settings is now a short list you drill into, instead of one long scroll.**
  Six topics — Food preferences, Distance, Maps app, Language, Who's using
  Faves?, Your data — each one a row that opens its own screen, and each row
  showing what it's currently set to ("Gluten free · 3 allergens flagged",
  "Hide places past 25 km"). On a phone the whole list now fits without
  scrolling; before, the allergen chips, both distance dials and the reset sat
  below the fold with nothing to say they were there, and only one of the eight
  allergens showed until you tapped "Show all". All eight are visible at once
  now. Whoever is browsing stays switchable in one tap at the top of the list.
  "Reset to defaults" moved in beside "Download my data" and asks before it
  clears anything, naming the person and saying what it leaves alone.

### Added
- **Faves now remembers when.** Every price, dish, menu and venue can carry its
  own dates, so the data can answer questions it simply couldn't before: what a
  dish used to cost, when a place joined Faves, whether it's shut for a refit or
  gone for good, and which dishes are only on the summer menu. **Choosing dinner
  looks exactly as it did** — the app resolves everything to "today" before it
  draws a single pixel, so you see tonight's menu at tonight's prices and
  nothing else. The one visible addition: a venue that's temporarily or
  permanently closed now says so on its card and at the top of its menu, and
  drops out of "Pick for us" — a stale price costs a dollar, but a closed venue
  costs a trip across town.
- **Takeaway @ Churton's 2019 prices, recovered.** The record was refreshed from
  the current printed menu earlier today, which meant seven years of prices were
  about to be lost. They were recovered from the repo's own history: 174 dishes
  now carry both their 2019 and their 2026 price (Wonton Soup $10.50 → $17.50 —
  a median rise of 50% across the menu). Five dishes the refresh removed are
  back in the record too, marked as no longer on the menu rather than deleted.
  Nothing about this shows on screen yet; it's the groundwork for showing how
  prices have moved.
- **Three more places: Sushi Bi, TJ Katsu and Subway.** Sushi Bi (37 pieces
  and platters, three CBD stores) and TJ Katsu (23 dishes, seven branches
  including the airport) both arrive with full menus taken from each venue's
  own site; Subway lands as a "menu coming soon" card with five branches —
  Johnsonville, Tawa, Karori, Courtenay Place and Mulgrave Street. Subway's
  hours and phone numbers are left blank on purpose: every source for them is
  a third-party directory, and they contradict each other.
- **Download your data.** Settings → "Your data" saves everything you've put
  into Faves — every profile's favourites, ratings and preferences, plus the
  shared order tally — as one dated JSON file you can keep. It covers everyone
  on the device, not just whoever is active, and it works offline. Your last
  "Near me" location is deliberately left out, and the file says so.
- **Gold Lining's full menu** (the cafe in the BNZ building), transcribed from
  the printed brunch and drink cards plus the cabinet, bakery and slice
  displays: 106 items across brunch, add-ons, soup of the day, four cabinet
  sections, the full coffee and iced-drink list, and Huskee keep cups. Two
  items show as "varies" rather than a made-up price — the Falafel Wrap and
  the Bliss Balls, whose price cards weren't readable in the cabinet.
- **The full current menu for Takeaway @ Churton**, transcribed from the
  printed menu and replacing prices that dated from 2019. 184 items, now
  including the shop's own order numbers so you can read an order down the
  phone by number.
- **A security policy and a public-facing README.** `SECURITY.md` says how to
  report a vulnerability (privately, through GitHub security advisories) and
  is specific about what is and isn't in scope for a site with no backend, no
  accounts and no third-party code. The README now opens by explaining what
  Faves is to someone who has never seen it, and carries licence, contributing
  and security sections. Groundwork for making the source repository public.

### Fixed
- **Menus work offline again.** One of the menu screen's modules was never
  added to the offline precache list when it shipped, so opening a menu in
  flight mode could fail outright. Every shipped module is now precached, and
  a test checks the list against the source directory so one can't be missed
  again.
- **Switching who's using Faves now updates a still-loading menu correctly.**
  Previously, switching profile while a menu page was mid-load could leave the
  first paint showing the previous person's allergen highlights (the header
  already named the new person). The re-point of allergen/dietary prefs now
  happens the instant the switch is tapped, so the menu always renders the
  active person's safety settings.
- **Recipe pages now react to an allergen/dietary change made in another tab.**
  A recipe's ⚠ allergen tags used to ignore a preference change made elsewhere
  until reload; they now re-apply live, matching the menu and home screens.

### Changed
- **Ratings are now 1–5 stars on a tap-or-drag slider.** The old 1–3 three-star
  control read ambiguously and crowded the row. Rate by tapping a star or
  dragging across the scale (or arrow keys); the rating now sits under the
  dish/venue name, clear of the ♥. (ADR 0019)

### Added
- **Settings is now reachable from a menu page too** (the ⋯ menu), not just the
  home screen. Changing your allergen/dietary preferences — or switching who's
  using Faves — now updates the open menu **live**: the ⚠ allergen highlights and
  the dietary dimming re-apply immediately, so a menu never shows another
  person's (or a stale) safety settings.
- **A travel-time hint next to the pickup address** on a menu page: "~15 min
  walk" when you're close, "~8 min drive" when you're further out — it picks the
  mode by distance (crossover at 2 km). A rough in-app "~" estimate off your
  Near-me location, no maps/routing call; only shows once Near-me knows where you
  are. (ADR 0021)
- **The app ⋯ menu is now on restaurant pages too** (Favourites, Share, About),
  not just the home screen — one tap from any menu. It scrolls away with the
  page like on home.
- **Multi-location venues show just your nearest branches.** A big chain (e.g.
  McDonald's) no longer floods the page with every address — it shows the two
  nearest (within your distance preference), with a "Show all branches" tap for
  the rest.
- **McDonald's added** as a multi-branch listing (Courtenay Place, Lambton
  Quay, Bunny Street, Johnsonville, Porirua) using the multi-location feature —
  real addresses and phones, and a menu of the enduring items. Prices show as
  "varies" (they differ by store); photos and per-store detail still to come.
- **Choose which maps app opens on an address.** Settings → **Maps app** lets
  you pick Apple Maps, Google Maps, Waze, or "Match my device" (the default,
  which keeps today's behaviour). The web can't read your phone's default maps
  app, so this is how you override it. (ADR 0018)

### Changed
- **Settings → Distance dial relabelled: "Show branches within".** The dial
  used to be described as a favourites ranking boost, but that ranking use
  went inert once home ordering became pure distance — it's since been
  repurposed as the cutoff for how close a chain's branches (e.g.
  McDonald's) must be to show on the contact card. The label and help text
  now describe what it actually does; the stored setting is unchanged, so
  no one's saved value resets.

### Fixed
- **The desktop menu's info column now scrolls with the page** instead of
  sticking in place — a long branch list (e.g. McDonald's) was getting its
  bottom cut off as the menu scrolled past it. Trade-off: the contact card no
  longer stays pinned for short single-location asides either.
- **Searching for a dish now jumps straight to it.** Picking a dish from the
  app-wide search took you to the right menu but left you at the top — you had
  to reload to land on the dish. It now smooth-scrolls to the dish on arrival
  (instant if you prefer reduced motion).
- **"Favourites" in the ⋯ menu stays readable on hover.** When the Favourites
  view was open, hovering or tapping its menu row washed the text out to
  near-invisible; it now keeps its contrast (both light and dark mode).
- **Settings profile panels no longer crowd their edges.** The add/rename and
  delete-confirm boxes used a full-pill corner radius that squeezed the text
  and buttons against the sides; they now use the standard card radius.

### Changed
- **Bigger, better-placed "back to top" button.** The floating back-to-top
  control was under-sized against the roomy tablet/desktop layout; it's now
  larger, and on a wide screen it sits beside the list/menu instead of off in
  the far corner where it was easy to miss.
- **Tapping an address opens the map at the right place again.** Tapping a
  venue's address now drops a **pin** on the map at its street address (rather
  than starting driving directions), and it points at the exact spot — some
  venues were landing a street over. Start directions from the pin if you want
  them; the "~N min drive" glance on the Near-me list is unchanged.
- **"Nearest first" is now strictly nearest.** When you sort by distance, the
  closest place is always on top — a hearted favourite still shows its ♥ but no
  longer jumps ahead of somewhere nearer. (Favourites still float up in the
  default list, where there's no distance to sort by.)
- **Menu edits no longer re-download the whole app.** The offline cache
  is now split in two — the app itself and the menu data have separate
  versions — so when a menu changes your phone fetches just the updated
  menus, not the entire app again. Nothing changes for you day to day;
  updates are simply smaller and quicker on mobile data. (Everything
  still works fully offline after the first visit.)

### Added
- **Pick along a route** — heading somewhere and want dinner on the way?
  Tap **Along a route** (next to Near me), choose where you're heading —
  a suburb or one of the places on the list — and Faves re-sorts by how
  little each venue takes you out of your way ("↩ +1.2 km detour", or
  "On your way"). Each card gets a **🧭 Route via maps** button that
  opens your maps app routed *through* that venue to your destination
  (on Android/desktop it's a real three-stop route; Apple Maps routes to
  the venue). The detour figure is a straight-line estimate — the maps
  handoff gives the true road route. Works fully offline: no maps
  service, no address typed or stored.
- **Rate your favourites** — you can now give any venue or dish your own
  personal ★ rating (1–3) on its menu. Your ratings stay on your device,
  per person (they follow your profile, like your hearts), and are never
  shared or averaged with anyone — no public or crowd ratings. Menus can
  also carry *our* curated "Our rating" mark, shown distinctly from your
  own; that's added by us in the site data (none set yet).
- **Profiles for a shared phone** — several people can each keep their
  own favourites and food preferences on one device. A "who's using
  Faves?" switcher in Settings lets you add someone (first name only),
  rename, or delete a profile; switching re-applies that person's hearts
  and — importantly — their own dietary/allergen filter, so nobody
  browses under someone else's allergy settings. Everything stays on the
  device, nothing is sent anywhere, and no one else can see it. Your
  existing favourites and settings become the first profile automatically.
  (No accounts, no cross-device sync — that would be a separate app.)
- **Drive time to a venue** — tapping a restaurant's address now opens
  your maps app with **driving directions** from where you are (not just
  a pin), so it shows the real, live drive time. In "Near me" mode each
  card also carries a rough "~N min drive" hint at a glance (an
  approximate straight-line estimate — the maps app has the real figure).
- **Opening hours for 15 more venues** — every restaurant now shows
  live open/closed status. Hours researched online (venue sites where
  they exist, aggregators otherwise); confirmation folds into the
  owner's general menu/details verification pass.
- **Restaurants with multiple branches** — a venue can now list several
  branches that share one menu but each have their own address, hours,
  phone and map pin. "Near me", the drive-time hint and the open/closed
  badge all use the branch nearest you; the menu screen lists every
  branch, nearest first, each with its own directions link and hours.

### Fixed
- **Te reo mode no longer mispronounces English for screen-reader users** —
  switching the app to Te Reo Māori used to mark the whole page as Māori, so a
  screen reader read the (deliberately English) menu, venue, and allergen text
  with Māori pronunciation. Now only the chrome actually shown in te reo is
  marked as Māori; everything else stays English, as it reads.
- **"Nearest first" now really puts the nearest first** — it was floating
  open (and favourited) venues above closer ones, so a 10 km place could
  sit above a 2.5 km one. With "Nearest first" on, distance now leads;
  whether a place is open still shows as a badge and has its own "Open
  now" filter. (The distances were always compared as numbers, not text.)

### Changed
- **Cook at Home sits top-right** on wider layouts — on the two-column
  grid the recipes card now takes the top-right cell so the first
  restaurant gets the prime top-left slot; on phones it stays anchored
  at the top as before.

## [1.0.0] — 2026-07-12 · launch

Live at <https://lets-eat.myspot.nz>, installed on the owner's iPhone,
and the link shared with family — launch day. Everything below shipped
between first commit and today.

### Added
- **The site is live.** Faves now publishes on Cloudflare Pages: every
  push to `main` deploys to <https://faves.pages.dev>, with
  <https://lets-eat.myspot.nz> attached as the real address.
- **Send your picks to the orderer**: when a few people are ordering from
  one place, each can build their own picks on their own phone, then tap
  **Send to the orderer** on the order sheet. It hands the order to the OS
  share sheet (AirDrop, Messages) — or a copied link — and opening it on the
  host's phone asks "Add Alex's 6 items?" before merging them into the running
  order, grouped by venue. Nothing is sent to a server: the picks ride inside
  the link's `#fragment`, which browsers never transmit. A garbled link just
  says "that link didn't work — ask them to resend". No pairing, no install,
  no account.
- **Scan-to-send QR fallback**: the send dialog now offers **Show QR code** — a
  QR of the order link rendered on the spot, so the orderer can point a camera
  at it when AirDrop or a copied link isn't the right path (two phones, one not
  Apple, no shared network). It's drawn by a tiny built-in encoder — no library,
  no network, no service — and stays dark-on-light so it scans in dark mode too.
- **Share your favourites**: the Favourites view gains a **Share these** button
  that sends your whole shortlist — places and dishes — the same way an order
  goes out (AirDrop, Messages, a copied link, or a QR to scan). Whoever opens it
  gets "Add Alex's 5 favourites?" and can save the ones they like into their own
  favourites; recipe favourites keep linking to the recipe, not a dead end. Same
  no-server, fragment-only design as order sharing.
- **Te reo Māori UI toggle**: a language switch in Settings (English / Te Reo
  Māori) that puts the app's chrome — buttons, labels, headings — into te reo,
  with correct tohutō. The menu content itself (dish names, descriptions,
  places) stays as the venues wrote it. Your choice stays on your device. This
  first pass covers the home screen and shared dialogs; a second pass the
  same day extended it to the menu and recipe screens (contact and ordering
  labels, picks, search, recipe headings). Allergen warnings and other
  safety text stay in English for now — deliberately, until the wording gets
  a reo review before launch.
- **Heart a place from the home screen**: the ♥ favourite toggle now sits on
  every browse card, so you can save the usual without opening its menu. It
  stays in sync with the heart on the menu screen and in your Favourites view.
- **"Pick for us" favours the usual**: the shuffle now leans toward the places
  you've hearted (a favourite counts a little more in the draw) — without ever
  excluding the rest, so the roll is still a surprise.
- **Personal food preferences**: set your **dietary needs** (vegetarian,
  vegan, gluten-free, dairy-free) and the **allergens to flag** once in
  Settings, and every menu applies them — your dietary chips come
  pre-selected, and a flagged allergen's ⚠ warning is made to shout with a
  warning rail down the dish. It stays on your device. Framed honestly:
  always confirm for allergies — we only show what venues told us, and no
  tag means "not stated", not "free of it". A highlight, not a guarantee.
- **More allergen tags available**: the menu vocabulary now also covers
  **egg, dairy, gluten, soy and sesame** (alongside nuts, peanuts and
  shellfish), each rendering as the same prominent ⚠ warning. These only
  appear where a venue or menu states them — "no tag = not stated" — so
  they'll fill in as menus are confirmed.
- **Published SBOM** (provenance): a CycloneDX Software Bill of Materials at
  `/.well-known/sbom.json` makes the "no third-party components" promise
  *checkable* — its dependency list is empty by construction, and CI fails if
  the committed file ever drifts from the shipped tree. Invisible to users;
  it's for anyone auditing what the site ships.
- **Dish order-numbers**: where a place takes orders by number ("two number
  14s, thanks"), the menu now shows that number as a small muted **#code
  badge** beside the dish — distinct from its name — and you can **search by
  the number** to find the dish. KC Cafe's board numbers (previously baked
  into the dish names) now render this way.
- **Two-column menu on tablet and desktop**: when there's room, the menu sits
  on the left and a **sticky info column** (call/pickup, hours, and the
  Order-online buttons) rides alongside it on the right, so contact details
  stay in view while you scroll a long menu. The order links stack in that
  column. On a phone it's unchanged — everything stacks in one column.
- **"Cheap eats" filter** on the home screen: a 💸 toggle beside "Open now"
  narrows the list to the **$** places (the ones already chip-flagged cheap on
  their cards). Combines with every other filter, and **"Pick for us" inherits
  it** — flip it on and the shuffle only rolls cheap places.
- Typical price per person: each place with a menu now shows a small
  **$/$$/$$$ chip with a "~$Npp" estimate** (on the home card and the menu
  header), worked out from that venue's own listed prices — no external
  source. It's a ballpark ("estimated from the menu", and our prices are
  already flagged as needing an in-store refresh), handy for "cheap eats or
  a treat tonight?". <!-- datescan:allow: product vocabulary — the diner's own question, not a dated claim -->
- Two more places in the pizza department: **Hell Pizza Newlands** and
  **Pizza Hut Johnsonville**. Menus still to capture (they show as "Menu
  coming soon"), but they carry address, phone, hours and coordinates, so
  they rank by "open now" and distance like everywhere else.
- Page footer on the home screen: a short privacy note — no accounts, no
  tracking, no third-party scripts, your favourites, order and settings
  stay on your device — and a "Made by cakeIT" attribution.
- Smarter default order: the home list now floats the places you can
  actually order from *right now* to the top and sinks the rest — open
  (right up to closing time) and opening-within-the-hour venues lead;
  closed ones drop to the bottom. Your **favourites** lift within that
  order — a hearted venue, or one holding a dish you've hearted, is treated
  as ~10 km nearer rather than always winning, so a favourite 8 km away
  beats a place 2 km away but a favourite 30 km away doesn't (a *closed*
  favourite still stays below anywhere open — it lifts, it doesn't
  override). With "Near me" on, distance refines the rest and a venue too
  far to reach tonight (a favourite in another town) sinks below everything <!-- datescan:allow: product vocabulary — "too far to reach tonight" is a named setting, not a dated claim -->
  nearby. "Pick for us" draws from the available set too, so the dice won't
  land on somewhere closed or unreachable.
- Distance settings (⚙ on the home screen): tune how much nearer a
  favourite counts (default 10 km) and how far is "too far to reach
  tonight" (default 50 km), with live sliders. Saved on the device; they <!-- datescan:allow: product vocabulary — quotes the "too far to reach tonight" setting name, not a dated claim -->
  reshape the order the moment you change them.
- Hearted favourites: tap **♡** on any dish (restaurant menus *and* Cook at
  Home) or on a whole venue to save it. A **Favourites** toggle beside the
  home search opens a view that gathers everything you've saved — Places
  and Dishes — each linking straight there, with an inline heart to remove
  it. Kept on the device only (`localStorage`), like the order tally; works
  offline, no account.
- Order tally: as people call out what they want, tap **＋** on a dish to
  build one running order. A floating order button (on every screen) opens
  a list grouped by restaurant — each with a subtotal and a **Call** link
  — plus an estimated grand total (captioned "confirm at the till", since
  our prices need an in-store refresh). **Collect mode** ticks items off at
  pickup. Kept on the device only (`localStorage`) — no account, no
  backend, no payment; it still hands off to phone/website to actually
  order. Cook-at-Home recipes carry no stepper (that's for cooking, not an
  order).
- Global search on the home screen: one box finds a **place or a dish**
  by name (also matching area, cuisine and — for dishes — description and
  ingredients) across every venue and Cook at Home. Results group into
  "Places" and "Dishes"; a dish links straight to its row on the menu
  (or its full recipe page). Runs entirely over the already-loaded data,
  so it's offline and zero-dependency. While a query is live the browse
  cards, filters and shuffle step aside; clearing the box restores them.
- Full recipe pages: tapping a Cook at Home dish name opens its own
  focused, shareable page (`recipe.html?id=…&dish=…`) — ingredients,
  method, serves/time, photo, allergen/dietary tags and "goes well with"
  links to the other recipes. The inline quick-expand stays on the list.
- 11 more Wellington venues as stubs (facts web-researched + geocoded;
  menus to follow): Regal Chinese, Babaili Malatang, New Chapter, Gold
  Lining, Pizza Pomodoro, Gong Cha, Satay Kingdom Cafe, Rock Yard
  Vietnamese, Cozy Cake Shop, The Catch Sushi Bar, Kaffee Eis. Adds new
  areas (Pipitea, Wellington Central) and cuisines (bubble tea, gelato,
  hotpot, sushi, yum cha…) to the filters.
- "Open now" filter: a toggle in the home results head narrows the list
  to venues open right now (or closing soon), using the hours engine.
  Combines with the service/area/cuisine filters and the "Pick for us"
  shuffle; venues with unknown hours drop out (the honest reading of
  "open").
- Recommended pairings: a menu item can carry a `goesWith` list ("goes
  well with…") shown as deep-link chips to the paired dishes, in the same
  record or cross-record. Seeded on Cook-at-Home mains (e.g. Shane's Ribs
  → Creamy Mushrooms, Turkish Flatbread, Sticky Date Pudding). See ADR
  0007 (chosen over reorganising Cook-at-Home around meals).
- Dish & venue photos: schema + rendering are in place — an optional
  `image` (+ required `alt`) on a venue shows a card photo, and on a menu
  item a dish photo, both lazy-loaded with a reserved aspect box (no
  layout shift) and self-hosted (offline-safe). Rolls out per venue as
  the owner adds photos to `intake/`.
- Live opening-hours status: home cards and the menu screen now show
  "Open · until 9pm" / "Closing soon · closes in 30 min" / "Closed ·
  opens 5pm", computed in New Zealand time (not the viewer's clock) so
  it's right for a guest browsing from anywhere (hours are stored as
  venue-local time, never UTC — a fixed UTC instant would drift across
  NZ's daylight-saving switch; a viewer whose device isn't on NZ time
  sees an unobtrusive "NZ time" label rather than a misleading
  conversion). The menu screen also
  shows the week grouped into ranges with today highlighted, and
  lunch/dinner splits rendered inline ("12pm–3pm, 5pm–9pm"). Backed by a
  new machine-readable hours model and a pure engine (`site/js/hours.js`)
  with unit tests.
- "Near me" distance sort (roadmap Theme 2): a home-screen toggle that
  uses the device location (`navigator.geolocation`) + haversine to sort
  venues nearest-first, showing each one's distance ("1.2 km") on its
  card. No tile map, no map library, no external request — offline-safe
  and zero-dependency; declining the location permission just keeps the
  usual order. Pure logic in `site/js/distance.js` with unit tests.
- Native maps handoff (roadmap Theme 2): tapping a venue's address on the
  menu screen now opens the device's own maps app — Apple Maps on
  iOS/macOS, the default maps app via a `geo:` link on Android, Google
  Maps on desktop — at exact coordinates. Added `lat`/`lng` (WGS84) to
  every venue in the schema, geocoded from their addresses, with
  validation and unit tests (`site/js/geo.js`).
- "Pick for us" (Phase 4): a shuffle over the filtered set that lands on
  one place with a deep link; instant under reduced-motion.
- Offline PWA (Phase 5): service worker precaches the app shell and all
  menus; network-first data, cache-first shell, capped image cache.
- Share/SEO polish (Phase 6): Open Graph + Twitter card + canonical meta
  on both screens, and a 1200×630 share image.
- Development conventions adopted from the `ros`/`tiki` repos: decision
  records under `docs/decisions/`, an append-only `docs/SESSIONS.md`,
  `CONTRIBUTING.md`, and this changelog.
- JS unit tests for the pure filter logic (`node --test`), run in CI
  alongside menu-data validation.
- Zero-dependency guard (`tools/check_no_deps.py`, a CI job) enforcing
  the no-third-party-components invariant from ADR 0001.

### Fixed
- **In-menu search** now has the same clear ✕ as the home search, and the
  pinned search bar no longer clips against the top edge when you scroll.
- **Section jump-nav** now scrolls sideways to keep the section you're reading
  visible and highlighted, instead of leaving it off-screen deep in a menu.
- **Collapsed allergen chips** no longer bleed a fade over a selected chip.
- **Settings gear icon** in the ⋯ menu sized to match the other icons.
- **Offline reliability**: if a file fails to download during a deploy, the
  install now aborts instead of caching the broken file and serving it offline.
- **Screen readers & te reo**: the back-to-top ↑ button, the About dialog and
  the Settings dialog now carry proper accessible names, and their labels
  translate with the rest of the chrome (they were silently inert before).
- **Settings "Show all" toggle** reappears after you rotate or resize the sheet
  narrower again — it used to vanish for good once the chips had fit one row.
- **"Pick for us" button** no longer stays hidden off-screen after you open then
  close search while scrolled down the list.
- **Menu toolbar** no longer drops down by a row's height on a short desktop
  window (the mobile contact bar's offset was leaking onto desktop).
- **"Show all" toggle** is now a full 44px tap target.

### Added
- **Back-to-top on the restaurant list** too (it was menu-only); it sits clear
  of the "Pick for us" pill and the filter bar.
- **Footer** now puts "About & privacy" and "Made by cakeIT" on one line.
- **Share this app**: a ⋯-menu item that hands the app's URL to the OS share
  sheet (AirDrop / Messages), or copies the link with a toast where native
  sharing isn't available.
- **Pick-for-us tucks away on scroll**: the floating "Pick for us" button slides
  out of the way as you scroll down the list and slides back when you scroll up.
- **About surface**: an "About" item in the ⋯ menu (and an "About & privacy"
  link in the footer) opens a dialog covering what Faves is, its privacy stance,
  and how it works offline. The footer's inline privacy note now lives there;
  a no-JS visitor still sees the note in the footer.
- **Contact bar collapses on scroll (mobile)**: once the full contact card
  scrolls out of view, a slim bar pins to the top with the open-now status and
  a "call to order" button, so ordering stays one tap away down a long menu.
  Desktop keeps its sticky info column.
- **Hell Pizza Newlands** now has a full menu (99 items) — transcribed from
  their official site and flagged "confirm prices with the venue" (web-sourced,
  not yet checked in store).
- **Back-to-top button on long menus**: a floating ↑ appears once you've
  scrolled down and returns you to the top (instant under reduced-motion).
- **Clear button in the search field**: a circular ✕ appears once you've typed,
  wiping the query and refocusing the box in one tap (the native `type=search`
  clear is WebKit-only and missing on mobile, so we ship our own everywhere).

### Changed
- **Home ordering pass**: the **Cook at Home** recipes collection is now pinned
  to the top of the list, and **"menu coming soon" venues sink below everything
  you can actually order from**. With "Near me" on, those menu-less places now
  sort by distance among themselves — so a closed café 400 m away no longer sits
  below an unknown-hours one 2 km away. "Pick for us" also skips menu-less stubs.
- **Settings language picker** is now a compact dropdown instead of a segmented
  pill, so it reads as "choose a language" rather than tabs, stays tidy in the
  dialog, and scales when a third language is added. Its field labels ("Your
  dietary needs", "Allergens to flag") are now full-contrast and body-sized.
- **Settings dietary/allergen chips collapse to one row** with a "Show all"
  toggle when they'd otherwise wrap and dominate the panel; if they fit one
  row, no toggle appears.
- **Settings allergen safety caveat** moved behind an ⓘ tip beside the
  "Allergens to flag" heading (the same disclosure as the menu caution),
  freeing the panel while keeping the always-confirm wording one tap away.
- The **"needs a refresh" ⓘ** beside an unverified venue's name now reads as a
  caution — orange and a little larger, with a soft halo when hovered/open —
  rather than a passive grey hint.
- The **"Faves" wordmark** no longer underlines on hover; it warms to the
  accent colour and lifts slightly, a cleaner cue that it takes you home.
- The home header is **decluttered into a "⋯" overflow menu**: Favourites and
  Settings now live under one button top-right, freeing the search field to
  span the full row. The Open-now / Cheap-eats / Near-me toggles stay with the
  list where they belong. Keyboard-navigable (arrows, Escape) and closes on an
  outside tap.
- The price band can now be **curated** where the menu-median misleads. The
  automatic $/$$/$$$ still derives from a venue's own prices, but a place can
  carry an explicit `priceBand` (and optional `pricePerPerson`) that wins —
  so a gastropub whose median is dragged down by bar snacks reads "$$", not
  "$", and a noodle house with a few pricey combos reads "$$", not "$$$".
  Curated bands are captioned as our call ("typical price band") rather than
  "estimated from the menu", and they correct the "Cheap eats" filter too.
  Set on Khandallah Trading Company and R & S Satay Noodle House.
- The **Favourites view now nests dishes under their place** instead of
  separate "Places" and "Dishes" lists — each spot is a heading with the
  dishes you've hearted there beneath it (the place shows even if you've
  only hearted a dish of it, with a heart to also save the whole place).
  Reads like "my usual at each spot".
- The **← All restaurants** back link on a menu or recipe page is now a
  clear bordered button instead of a faint text link — it was easy to miss,
  especially on desktop.
- On a long menu, the **search box now stays pinned** at the top alongside
  the section jump-nav, so you can filter the menu without scrolling back
  up. The dietary chips sit just below and scroll with the dishes.
- The menu "needs a refresh" caveat is no longer an always-on banner: it's
  tucked behind a small **ⓘ beside the venue name** that reveals the note
  on tap (and on hover for mouse users), so the header reads clean. An
  accessible disclosure — a real button with `aria-expanded`, closes on
  Escape or an outside tap — not a bare tooltip, so it works on touch.
- Clearer navigation on the home screen: the **"Faves" wordmark is now a
  home button** — already on the home screen it exits any open search or
  favourites view and scrolls to the top (a plain link to the home page if
  JavaScript's off). The favourites view gained an obvious **"‹ All places"**
  button, since pressing the Favourites toggle again to get back wasn't
  discoverable.
- Favourite hearts are larger and higher-contrast — a clear outline heart
  when unsaved, a filled accent heart when saved — with a springy pop when
  you save and a hover scale on pointer devices (motion-free under
  prefers-reduced-motion).
- Menu section headings now stick under the jump-nav while you scroll a
  long menu, so which section you're in ("Pub Snacks", "Pub Mains") stays
  visible instead of scrolling away; the next heading pushes it up. Dish
  deep-links (picks, "goes well with") account for the taller sticky
  stack.
- Restaurant cards now respond to hover: the whole card lifts with a
  deeper shadow, an accent border, and the name tints to accent. Only on
  cards that link somewhere (not "coming soon" stubs), only on true-hover
  devices (no sticky state after a touch tap), and motion-free under
  `prefers-reduced-motion`; keyboard focus gets the same accent border.
- Corrected the `CLAUDE.md` zero-build wording: Node may be used for dev
  tooling (Lighthouse, tests) but is never a build or runtime dependency;
  the site still ships build-less.

### Fixed
- **QR share card fixed three ways**: it no longer shows an empty white oval
  before you tap "Show QR code", **Hide QR code** now actually hides it, and the
  code renders as a proper square instead of being clipped to a pill (which was
  shaving off the corner finder patterns and could stop it scanning). Root cause
  was a CSS rule that let elements ignore their `hidden` attribute; a single
  app-wide guard now makes `hidden` always win, so this class of bug can't recur.
- **Selected dietary/allergen chip no longer looks clipped**: when a chip group
  was collapsed to one row, the clamp cut through the pressed chip's rounded
  bottom; it now clips in the gap below the row.
- **Opening a restaurant no longer fails with "This site can't be reached."**
  Cloudflare Pages 308-redirects `/restaurant.html` → `/restaurant`, and the
  service worker was caching (and returning) that redirected response — which
  browsers refuse to hand to a page navigation. The worker now strips the
  redirect before caching or serving, so deep links and offline both work.
- **Header ⋯ menu no longer stuck open**: a CSS rule kept the popup visible
  regardless of its `hidden` attribute, so it rendered open on load; it now
  hides correctly when closed.
- **Screen-reader labels actually attached**: several hidden accessibility
  labels on the menu screen and order sheet were being set in a way browsers
  ignore, so assistive tech never saw them. They're now real attributes.
- Menu screen no longer scrolls sideways on a narrow phone — the sticky
  toolbar's jump-nav strip now shrinks and scrolls within itself instead
  of pushing the whole page wider than the viewport.
- Home filter bar wraps to two rows on a phone so the **Area** and **Cuisine**
  selects stay full width and legible (they were collapsing to ~39px stubs at
  390px); the service toggle gets its own row above them.
- Reduced-motion now genuinely disables smooth scrolling — the smooth-scroll
  rule is gated behind `prefers-reduced-motion: no-preference` instead of
  being silently overridden.
- Touch targets brought up to the 44px minimum: the menu section jump-nav
  links, dietary chips, quantity steppers, and "goes well with" pairing chips.
- Dark-mode colour contrast on the "Call to order" label (WCAG 2.2 AA),
  bringing the menu screen to Lighthouse Accessibility 100.
