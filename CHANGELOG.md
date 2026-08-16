# Changelog

Notable changes to Faves, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This is a
curated site, not a released package — versions here are milestones,
not tags. Per-restaurant "verified on" dates in the menu data track
content freshness separately from this file.

## [Unreleased]

### Added
- **A recipe made of parts now says so.** Recipes with a base and an icing, or a
  pudding and its sauce, show each component under its own heading instead of
  repeating "Sauce:" at the front of every line. Your ticks carry over — nothing
  you had already ticked has come undone.
- **Fold the ingredients away once everything is in the bowl.** Tap *Ingredients*
  on a recipe to collapse the list and get the method up the screen. Faves
  remembers, so every recipe opens the way you left the last one.
- **Two columns of ingredients on a wide screen.** On a laptop a long list now
  uses the space beside it rather than running off the bottom. Phones are
  unchanged, and a short list stays in one column where a split would just look
  broken.
- **A recipe can credit where it came from.** The chocolate self-saucing pudding
  now carries "Adapted from the Edmonds cookbook" as a proper credit, and
  searching for *Edmonds* finds it.

### Fixed
- **The tick boxes line up.** The ingredients' ticks and the method's ticks now
  share one column down the page, and on a method step that runs to more than one
  line the step number sits beside the first line rather than floating halfway
  down the paragraph.
- **Your favourites, ratings and settings now follow you across your devices.**
  Settings → *Sync across your devices* → turn it on, and you get a code. Type
  that code into Faves on your other phone, tablet or laptop and the two stay in
  step from then on — hearts, star ratings, food preferences, distance dials,
  language and units. **It is end-to-end encrypted**, so the server stores
  nothing anyone can read, including us. There is no email, no password and no
  profile: the code is the only thing that identifies your data, which also
  means anyone holding it can read and change that data, so it is worth keeping
  like a password. It is entirely optional, off until you turn it on, and if it
  can't reach the internet the app carries on exactly as before — your data
  always lives on your device first.
  - **Removing something removes it everywhere.** Un-hearting a place on your
    phone takes it off your laptop too, rather than the laptop putting it back.
  - **Allergen settings are never merged behind your back.** If you changed
    them on both devices, Faves asks which to keep, and warns about both in the
    meantime.

### Changed
- **The home list has one order now, and how far away a place is finally
  counts.** There used to be a *Sort by* control with two orders in it. There is
  now one: places you can actually order from right now come first, then the
  nearest of those, and a heart breaks the tie between two that are much the
  same distance away. Tap **📍 Use my location** above the list to let Faves use
  your location; without it the list stays in the order it has always been in,
  and nothing nags you about it.
  - **A heart is a tiebreak, not a shove.** A favourite lifts a place above
    another one roughly as close by — not above the shop next door when it is
    across town. (It used to be worth 10 km on paper, which is why it never got
    to run.)
  - The button says **📍 Use my location**, not "Near me" — it is the one thing
    in Faves that makes your browser ask a permission question, so it says what
    tapping it does rather than what you get.
  - **Faves does not ask for your location out of the blue.** Nothing prompts
    you until you tap the button. If you have already given Faves your location
    before, it just works with no prompt at all — and if you have blocked it, the
    app now says so plainly instead of quietly doing nothing forever.

- **The version you're running now sits with the button that updates it.** Which
  version of the app and menus this device has, and whether an update is ready,
  used to be in *About* while *Refresh now* was in Settings — so answering one
  question ("am I up to date, and if not, how do I fix it?") meant two screens.
  Both are in Settings → *Refresh & reset* now, and About no longer carries a
  version at all.
- **Sync now lives inside Settings → *Your data*.** It used to be a row of its
  own, one below it. Saving a copy of your data, bringing one back, and keeping
  your devices in step are three answers to the same question — "how do I not
  lose this?" — so they are now on one screen instead of two.

### Removed
- **"Transfer to another device" is gone.** It made a one-off link that copied
  the person you were browsing as — favourites, ratings and preferences — onto
  a second device, and then the two drifted apart again. Both of the things it
  sat between do the job better and are still here: *Download my data* saves a
  file that restores a whole device, and *Sync across your devices* keeps two
  devices the same from then on. Any transfer link you were sent before today
  no longer opens.
- **The "Along a route" sort is gone.** It asked you to pick a *suburb* you were
  heading to, then ordered places by how far off the straight line between you
  and the middle of that suburb they sat. The middle of a suburb is not a route,
  so it recommended places that were plainly not on the way — Khandallah Trading
  Company for a drive from Churton Park to Courtenay Place. Rather than leave a
  feature that misleads, it has been taken out entirely. The real version — type
  in the address you're heading to, and see the places near the actual road
  route there — is still to come. "Nearest first" is unchanged.
- **The "Clear ticks" button is gone**, from both the recipe page and cook
  mode. Ticks already clear themselves twelve hours after the last one is
  made, so a recipe cooked again next week never started half-ticked without
  it — the button had no job left to do (owner ruling).

### Fixed
- **Ordering, website and pickup links now warn a screen reader before they
  leave the site.** Every link that opens in a new window — "Order online",
  the venue's website, and the pickup address's map link — carries a
  visually-hidden "(opens in a new window)" note, per WCAG technique G201.
  It names only what the link is certain to do; it never claims a native app
  will open, because no browser API can confirm that in advance.
- **A transfer link no longer freezes your language and units to wherever you
  made it.** If you'd left language or units set to follow wherever you are, the
  link was carrying the *resolved* answer — English and kilometres, if you made
  it at home — and the receiving device kept that as a fixed choice. It now
  carries "follow me" as "follow me". Restoring a backup into a profile you
  already have also brings your **units and currency** across; they had been
  silently dropped on that path since those settings were added.

### Added
- **You can tick off ingredients and steps as you cook, and the ticks survive a
  phone call.** Every ingredient and every step on a recipe is a real checkbox,
  on both the recipe page and inside cook mode, and what you tick in one shows
  up in the other. They survive a reload, a call and closing cook mode — and
  they clear themselves after twelve hours, so a recipe you cook again next
  week never starts half-ticked. Ticks are per person, like your hearts and
  your allergen settings.
- **Cook mode can read the step out loud**, for when your hands are in a bowl.
  One tap starts it, another stops it, and it stops on its own when you move to
  the next step or close cook mode. It uses the voice built into your phone, so
  there is nothing to install — **but some phones fetch their better voices from
  the internet, so this one control may not work in flight mode**. The words
  stay on screen either way. A browser with no speech simply doesn't show the
  button.
- **"How we know" is now told branch by branch.** Where a venue has several
  branches, the ⓘ beside its name can say how *that* branch's phone, address
  and hours were checked, and name it. Pandan is the first: its Melling details
  come from Pandan's own site, while the Press Hall opening hours are the food
  hall's. Previously one venue-wide answer had to cover both, so it read as the
  weaker of the two and Pandan's own address was described as coming from a
  directory listing.
- **Three chains now show all their Wellington branches.** Hell Pizza went from
  one location to **14**, BurgerFuel to 4 and Kaffee Eis to 3 — each with its own
  address, phone and opening hours, so the card can offer you the nearest one
  that is actually open. Gong Cha, Noodle Canteen and Pizza Hut are deliberately
  still showing one branch: their own websites don't publish opening hours per
  store, and a branch without hours would be offered to you with no way of
  knowing whether it is open.
- **A saved favourite that isn't there any more now says so — and offers to
  check.** Previously, a hearted dish that had left the menu just sat in your
  list, and tapping it landed on a menu with the dish quietly absent, or a dead
  error screen. Now it's marked *"Not on your current list"*, with a **Refresh**
  that goes and looks. **The wording never guesses**: until it has actually
  checked, it says *"This may have been removed, or your list may be out of
  date"*, because your phone genuinely cannot tell those apart. Offline it says
  so and stops. Only after a real check comes back empty does it say the dish is
  gone — and if it turns out your list was simply behind, the mark disappears and
  it tells you that instead.
- **The filter controls are now on the page on a laptop**, instead of hidden
  behind a button that opens a sheet designed for a phone. "Clear all" comes with
  them. On a phone nothing changes.
- **Cook mode shows you what each step needs, and times the waiting.** A step
  now lists just the ingredients it actually names — with their quantities —
  instead of hiding the whole recipe behind an "Ingredients" button that sat
  there even on "preheat the oven". The instruction can stay short because the
  amounts are already beside it. And a step that says how long it takes ("bake
  for 35 minutes") gets a one-tap countdown: tap to start, tap to pause, Reset
  to put it back. The countdown runs off the clock, so a phone that sleeps
  mid-bake comes back with the right number. Timers only ever appear where the
  recipe states a time — none is invented.
- **The app menu (⋯) is now on recipe pages too.** A recipe could show CONTAINS
  GLUTEN chips with no way to reach the Settings that decide which allergens get
  flagged. Settings, Favourites, Share and About are one tap away there now,
  from the same ⋯ menu the other screens use.

### Fixed
- **The ⓘ notes now open the same way everywhere — a tap or a click, never a
  hover.** Pointing at one used to open it, but the note vanished the moment you
  moved the mouse toward it to read, and Escape wouldn't close one opened that
  way. Both are accessibility failures (WCAG 2.2 AA), and they hit hardest the
  people most likely to need the note: anyone reading slowly, using a screen
  magnifier, or with an unsteady hand. Every ⓘ now behaves the same on a phone,
  a mouse and a keyboard.
- **The back-to-top button no longer sits on top of a price.** It slides out of
  the way while you're scrolling down and comes back when you scroll up. Measured
  rather than eyeballed: it had been covering **the whole width of a dish price**,
  and on the home screen up to 94.6% of a place's heart — at roughly one in five
  of the places you might stop scrolling. It also starts out of the way, so a link
  straight to a dish no longer opens with a button over it.
- **The `Faves` wordmark in the header is now a full-size tap target** (it was
  32 px tall against a 44 px floor).
- **A menu that won't open now tells you the truth about why.** Opening a link
  to a place we can't load used to say "check your connection and reload" —
  asserting a network problem it had never checked, when the usual cause is a
  place that has moved, closed or been renamed. It now names both
  possibilities, and only says the place was removed after actually going to
  look. **Refresh** does that check from the screen; if the place is still
  there, the menu simply opens. A link with no place in it at all keeps the
  plain old message, because there is nothing to go and check.
- **A shortlist you share now opens on the dish you meant.** Where a venue has
  two dishes with the same name at different prices — Sprig & Fern Tawa lists
  *Cheeseburger* three times, at $28, $21 and $15 — a shared shortlist arrived
  at whichever one came first, so a friend could open your $21 Gold Card pick
  and see $28. The share code now carries each dish's own identity alongside its
  name. **Codes you shared before this still work exactly as they did**, and a
  phone that has not updated yet can still open a new code.
- **A place's "our picks" can no longer disappear silently.** A pick recorded by
  a dish's identity rather than its name was being dropped before the page drew
  it, with nothing to show it had gone. Nothing in the app was written that way
  yet — this closes it before the first one is.

- **The ⓘ beside "Allergens to flag" no longer flickers when you point at it.**
  On a mouse, hovering that ⓘ opened its note, which grew the centred Settings
  sheet, which slid the ⓘ 54px up out from under a pointer that had not
  moved — closing the note, shrinking the sheet, and putting the ⓘ back under
  the pointer to start again. Inside Settings the note sits in the page flow
  (it was moved there so the sheet's scroll box could not clip it), and a hover
  reveal that shifts the layout under the pointer can only oscillate. That ⓘ is
  now click-only, which is what touch and keyboard already used. The ⓘ notes on
  a menu page are unaffected — those float over the page and move nothing.

### Changed
- **"Start cooking", and a button that no longer shouts.** The way into cook
  mode was a full-width orange bar with an emoji on it — the heaviest thing on
  a page whose subject is a recipe, and on some machines the emoji fell back to
  a glyph that read as a magnifier. It is now an ordinary-sized button in the
  app's own style: accent on a recipe's own page, where starting to cook is the
  point, and quiet in the Cook at Home list, where it is one of twenty-odd. In
  the list it leads the recipe rather than trailing the method, so you no longer
  scroll past the whole thing to reach it.
- **The back link on a recipe now sits where every other back link sits.** It
  was a lone pill hard against the edge of the window while the recipe itself
  sat in the centre column; it is now in the same top bar the menu pages use.
- **Search results now show you *why* they matched.** Searching "Bar" returned
  1841 Bar & Restaurant and The Catch Sushi Bar alongside places that genuinely
  are bars, with nothing to tell the two apart — a wide search is right (you
  should find "Charley Noble" by typing "Noble"), but you could not see whether
  a result was a real match or a spelling coincidence. The matching word is now
  highlighted where you can see it, and where the match was on something the row
  doesn't show — an address, a phone number, a dish description — the row says
  so: *"Matched: address"*.
- **A link to a menu section keeps working when the heading is renamed.** The
  anchor used to be built from the heading text, so renaming "Brunch (served
  till 2pm)" to "Brunch" silently invalidated every link anyone had shared to
  it — which is exactly what happened earlier the same day. Each section now
  carries its own stored id and the heading is free to change without the link
  following it. 210 of 235 sections seeded; nothing moved on the day it ran.
- **A section's serving time is subtext, not part of its heading.** "Brunch
  (served till 2pm)" put a 24-character chip in the jump-nav strip you scroll
  with a thumb, and Sprig & Fern's Gold Card heading was **53 characters** —
  wider than a phone screen. The heading is now just the name ("Brunch", "Gold
  Card"), with the venue's own qualifier printed under it in the menu. Six
  sections across four venues moved. One consequence worth knowing: a link
  shared to one of those sections (`#section-brunch-served-till-2pm`) now lands
  at the top of the menu instead of the section.
- **A dish photo is a thumbnail beside the dish, and opens full-size on a tap.**
  Photos shipped full-bleed and put roughly one dish on a phone screen, which
  turned a menu into a gallery you scrolled past to read. The picture now sits
  to the **left of the dish name**, top-aligned with it, at a size that grows
  with the window (88–136px); the name, rating, description and tags stack
  beside it and the heart, report and Add row clears underneath. Tap it for the
  full-size view — backdrop, Escape, ✕ or a tap on the picture all close it.
  The cutouts sit on a **white mat in both light and dark mode**: they were shot
  on white and read as photographs on it, where on a dark surface they floated
  in a void. Owner-confirmed on his own phone and laptop, 2026-08-16, after
  three passes.
- **Picking a branch now costs one tap, and the one you're offered is open.**
  A chain's menu page used to show its two nearest branches fully expanded and
  hide the rest behind "Show all N". Now a single branch leads — the nearest one
  that is **open**, not merely the nearest — and up to four more sit beside it
  as collapsed rows you can open with one tap each. The second step only appears
  past those, which removes it entirely for McDonald's, Subway, Sushi Bi and
  Pandan; only TJ Katsu's seven branches still need it. Openness is three-state:
  **10 of our 22 branches carry no hours at all**, and a branch we know nothing
  about is never labelled open *or* closed, and never ranks below one we know is
  shut. Branches your distance limit hides are now counted on the card with a
  button that opens the setting, instead of vanishing silently (ADR 0054).

### Added
- **Dish photos, on every McDonald's item.** All 41 dishes now carry a
  photograph — the first use of dish photos anywhere in the app. They are
  McDonald's own New Zealand product images, so a named, trademarked product is
  shown as the product and not as a generic burger from a stock library; open
  alternatives were checked dish by dish and lost on accuracy, not on licence
  (the record is in `data/images/mcdonalds.json`). Each is a transparent cutout
  trimmed to the food and re-centred in one frame, so the set is framed
  identically and takes the card's own colour in light and dark mode. They
  lazy-load and are cached on demand, never precached: 1.17 MB across 41 images
  (29 KB each) that costs a first visit nothing.
- **Four more Sprig + Fern taverns, and they are their own places.** Petone,
  Berhampore, Thorndon and Little Sprig Seatoun each have their own address,
  hours, phone and map pin. They are not listed as branches of one venue,
  because they are not: each is a separate franchise with its own kitchen and
  its own menu, and showing one tavern's menu — and its allergen tags — against
  four kitchens that don't cook that food would be a claim about the wrong
  kitchen. Their menus are read in later; the Tawa menu stays on Tawa.
- **Three more Petone places** — The Victoria Tavern, Caffiend and Baylands
  Brewery — findable by name, area and pin. **Baylands has its full food menu**,
  26 dishes read from the brewery's own PDF, with allergens tagged. The other
  two have no menu yet, and deliberately so: one venue's site is currently
  serving a broken security certificate and the other's domain no longer
  resolves, so there is no source we would trust.

### Fixed
- **The order tally could overcharge you, and no longer can.** A place that
  prints the same dish twice at different prices — Sprig + Fern lists
  *Cheeseburger* three times, at $28, $21 and $15 — was one dish as far as the
  tally was concerned. Adding the $21 one to a tally already holding the $28
  one gave "2 × Cheeseburger" at **$56 instead of $49**. Every dish now carries
  its own identity, so they are three separate lines at three separate prices.
- **Hearts, ratings and shared links stop pointing at the wrong dish.** Same
  cause: hearting the kids' fish and chips hearted all three fish and chips, a
  link to the Gold Card price could never reach it, and choosing a sauce on one
  dish silently cleared it on the same-named dish further down the page. A
  dish's identity is now written down rather than worked out from its name, so
  a shop renaming a dish no longer quietly detaches every heart and rating on
  every family phone.

### Changed
- **The home screen is mostly places again.** Every filter and sort now lives in
  one sheet behind a single `Filters` button in a slim bottom bar, grouped and
  labelled for the first time — **Narrow to** (service, area, cuisine, open now,
  cheap eats) and **Sort by** (near me, along a route), which is a real
  distinction the old undifferentiated chip row never made. On an iPhone the
  chrome drops from 50.7 % of the screen to 31.9 %, and from 58.4 % to 34.5 %
  when you arrive by tapping a cuisine on a menu — 3 cards visible becomes 4,
  and 2 becomes 4. Nothing was removed: the button carries a count of what's on,
  and the chips beside the result count still name each one and clear it in a tap.
- **"Pick for us" moved into the bar.** It used to float over the list, where it
  covered 63 % of a venue's ♥ on the landing screen — measured, and exactly what
  the owner had seen. Nothing floats over the cards now.

### Fixed
- **Three filter buttons were under the minimum tap-target size.** The
  Everywhere / Takeaway / Dine-in control shipped at 40 px tall at every screen
  width, against the app's own 44 px floor.
- **The "Call to order" button no longer looks cut off.** Pinned to the top of a
  long menu it was exactly as tall as the bar holding it, so its rounded bottom
  sat flush on the edge and blurred into whatever was scrolling past
  underneath. Measured before and after in a real browser: 3px of clearance
  became 11.5px.

### Added
- **Order a dish the way you actually eat it.** Where a venue offers extras,
  the dish now carries them as real choices instead of a sentence in the
  description — Wellington Kebab Grill's twelve sauces (choose up to three,
  free), toasted or fresh, and its five paid extras; Sprig & Fern's brunch
  sides, the gravy on the fries, the "chicken, halloumi, prawns or beef" on a
  salad. The shop's own rules are kept: a cap of three refuses a fourth.
- **Adding something can change what a dish contains, and the app now says so
  as you choose.** Put satay on a kebab and it tells you the plate contains
  peanuts — before you add it to the order, not after. If it is an allergen you
  have flagged in Settings, the whole dish lights up. Dietary claims work the
  other way: a dairy-free dish stops claiming dairy-free once you add halloumi,
  and a vegan dish stops claiming vegan once you add chicken — with the reason
  spelled out, because "Halloumi contains dairy" and "we can't say whether
  Mushrooms is dairy free" are different things to be told.
- **A menu no longer prints the same thing twice.** Where a section's rows are
  all offered as add-ons — Wellington Kebab Grill's "Extras", Sprig & Fern's
  "Brunch Sides" — the section itself is no longer listed. The dishes are still
  in the record, so an order link that names one still works.
- **The same dish, configured two ways, is two lines on the order sheet** — at
  its own price, and read out at the counter with what you asked for
  ("2× Iskender with Mild chilli, Garlic yogurt"). Shared group orders carry
  the configuration too; links sent before this still work.
- **A filtered list now says so, and hands you the way out.** When an area or
  cuisine filter is on, it appears as a chip beside the place count — "Malaysian
  ✕" — and one tap clears it and restores the full list. It matters most when
  you arrive from a venue's subheading link: the list is narrowed without you
  having touched anything on that screen, and the only undo used to be a
  dropdown at the far end of the page.
- **A venue's cuisines and suburb are now links.** "Asian · Malaysian ·
  Noodles — Johnsonville" under a venue's name used to be a label; tap any
  part of it and you land on the full list filtered to it — every Malaysian
  place, or everything in Johnsonville — with the dropdown up top set to
  match, so it's obvious why the list is short and one tap to widen again.
  The address bar carries the filter (`?cuisine=Malaysian`), so a filtered
  list is a link you can share or bookmark.

### Changed
- **The restaurant cards are quieter.** "Dine-in, Takeaway" is gone — nearly
  every place offered both, so it separated almost nothing, and service is
  still a filter and now a search term. The open/closed badge moved up beside
  the suburb, with its traffic-light dot: green open, amber closing or opening
  soon, and **red for closed** (it used to be grey, the one state that didn't
  signal itself). Cuisine and the per-person estimate stay. **For a place with
  several branches the card now names the branch it's actually describing** —
  so the hours can no longer be captioned with another branch's suburb.
- **A place without a menu is no longer a dead end.** All 23 "Menu coming
  soon" venues now open, because we hold real detail for every one of them —
  address, map handoff, phone or hours. **15 of them now show whether they're
  open right now** ("Closed · opens 5pm") on the home screen, which they never
  did before. A venue we hold nothing but a name for still doesn't link.
- **The venue page stops saying the same thing twice.** The standing "Read in
  store, 15 Aug 2026" line is gone — the ⓘ beside the venue name already gives
  that date, plus what was checked and how.

### Fixed
- **A new version of the site can no longer fail to reach installed phones.**
  Changing a file under `site/` without bumping the matching version constant
  made the service worker skip rebuilding that cache — so phones that already
  had the site kept serving the old one, indefinitely, with no error anywhere.
  It happened on 2026-08-16 and reached a real phone. Now caught in CI
  (`tools/check_versions.py`), with its own test proving the check still fires.
- **The rate-age line under the currency picker stops crowding it.** The note
  sat hard against the dropdown, close enough to touch its highlight the moment
  the control was used — which is exactly when you're looking at both.
- **The "something's wrong" flag on a dish is visible.** It was rendering at
  two-thirds the size of the ♥ next to it *and* dimmed to 75% — two reductions
  stacked on one control, in a box that gave no hint anything was there. It now
  sits in the same size family as the ♥ (86% of it, since a solid ⚑ reads
  heavier than an outline ♡) at full strength, in a matching 52 px box. It's
  still the secondary action, but signalled by colour alone rather than three
  ways at once.
- **The allergen ⓘ in Settings is legible again.** Its halo was a filled block
  the size of the 44 px tap target sitting off-centre beside a small glyph — it
  is now a circle around the glyph itself, and the tap target is unchanged. The
  note it opens no longer runs past the edge of the settings dialog and get
  clipped: inside Settings it sits in the flow and pushes the chips down. Its
  wording is plainer and shorter, with the two things that must not be misread
  in bold — **ask the place if you have an allergy**, and **no tag means we
  don't know, not that it's safe**.
- **The order number sits after the dish name**, not before it. Leading with
  the code made every row start on a number, so the eye had to step over it to
  reach the dish — and a screen reader read "#1 Wonton Soup" instead of
  "Wonton Soup #1".
- **The opening-hours badge stops repeating itself.** "Opens soon · opens in
  14 min" is now just **"Opens in 14 min"**, and "Closing soon · closes in
  12 min" is **"Closes in 12 min"** — the number is the useful half, and the
  amber dot already says "soon". Further out, where the two halves genuinely
  differ, both stay: "Closed · opens Tue 11am".
- **The update prompt sounds like a food app.** "A newer version of Faves is
  ready" → **"Get it while it's hot! Update for the latest menus and prices."**
- **The search hints hold longer, and cross-fade instead of snapping.** They
  changed every 4 seconds, which read as restless — a hint is a whole sentence
  and needs to survive a glance. Now roughly 7 seconds, with the placeholder
  fading out, swapping under cover and fading back in. Still frozen the moment
  you focus or type, and still no rotation at all under *reduce motion*.
- **About → Version reads in the right order.** "What this page is currently
  running." sat *underneath* the version numbers, where it read as a stray
  caption; it now sits under the **Version** heading and above them, at body
  size — heading, then prose, then detail, the order the rest of the dialog
  already used.

### Added
- **Search finds far more than a name.** The one box on the home screen now
  also matches a venue's **address, city, service** (`takeaway`, `dine in`) and
  **phone number** — typed however you punctuate it — and a dish by the **diet**
  it satisfies, so "vegan" finds what the data stores as `vg`. A small set of
  phrases people actually type is mapped onto what the data calls things:
  "plant based", "coeliac", "eat in", "takeout". Deliberately *not* mapped:
  anything that would assert an allergen is **absent** — Faves records what a
  shop claims, never that something is free of an allergen we simply did not
  see.
- **The search box tells you what it can find.** Its placeholder cycles through
  examples — a dish, a place, an ingredient, a diet, a cuisine, a street, a
  service, a phone number — because a box that says "Search…" teaches nothing.
  It stops the moment you focus or type, and never starts at all under
  *reduce motion*.
- **Seven more places from the Cuba St guidebook** — Golding's Free Dive,
  Dragonfly, Dirty Little Secret, Garage Project Leeds Street, Abrakebabra,
  Wellington Sourdough and Hotel Bristol. Findable by name and on the map;
  menus to come.
- **A menu can be written in another language.** A dish can carry its name and
  description in as many languages as the record holds — so the heading reads in
  yours while the script from the wall sits just beneath it, ready to point at.
  Search finds a dish by any of its spellings. Every rendering is tagged for
  screen readers (WCAG 2.2 AA 3.1.2), which is why the feature is built this way
  rather than as plain text. No place uses it yet; the groundwork is in. (ADR 0044)
- **A place now keeps its own clock and its own currency.** "Open now" is worked
  out on the *place's* clock — so a venue in London reads correctly whether
  you're looking it up from Wellington or from down its own street — and prices
  show in the currency its own menu uses (`£8.95`, `¥900`), with the ⓘ beside
  them naming it. An order that spans two countries shows a total per currency
  rather than an unpayable sum. A "summer menu" now follows the hemisphere the
  place is actually in. Nothing changes for the places already listed. (ADR 0043)

### Fixed
- **The home screen was quietly serving its no-JavaScript fallback.** A missing
  import took `app.js` down on load, so the list of places rendered without
  filters, "Pick for us", the shuffle or any live open/closed badge — and looked
  almost normal while doing it. Fixed, and `tools/boot_check.mjs` now fails the
  build if any screen stops running its own JavaScript.

### Changed
- **A chain no longer wears a suburb in its name.** BurgerFuel, Hell Pizza,
  Noodle Canteen, Pizza Hut and Sprig + Fern are national chains, so the suburb
  moved to where branches have always lived — the venue now reads **BurgerFuel**
  with a **Johnsonville** branch, ready for the next one. ("Takeaway @ Churton"
  and "Khandallah Trading Company" keep theirs: there the place name really does
  contain the place.) Links you shared before the change still open the right
  venue, and your hearts, ratings and order lines followed it.
- **Settings is six groups instead of eight.** Language and units are one
  question — how the app talks to you — and distance and the maps app are the
  other: how it gets you to a place. Each half keeps its own sub-heading, and
  the index now leads with who's using Faves.
- **About no longer claims a single currency for the whole site**, because
  there isn't one: it states the rule, and each menu names its own. It gained a
  matching note about whose clock the opening hours are on. (ADR 0043)
- **Faves is no longer a Wellington app.** The title, the install name, the
  About panel, the share text and the te reo subtitle dropped the city: the
  collection is scoped to what we like, not to where it is, so a place loved
  anywhere in the world can join it. Venues keep their real areas and
  addresses — only the framing changed. (ADR 0042)

### Added
- **A dish now tells you what we haven't been able to check.** Where a price
  couldn't be read off a label, or a jar's ingredients aren't certain, the dish
  carries a small **?** you can tap — it says what's missing and what would fix
  it. And the price itself now distinguishes the two kinds of blank: **?** means
  *we don't know it*, while **—** keeps meaning *the shop prices it on the day*
  (market fish and the like). Deliberately kept out of the allergen chips, which
  stay for warnings about the food itself. (ADR 0041)
- **Drinks are on the menu now** — the full lists for **The Borough** (81) and the
  **Southern Cross** (85): taps, bottles and cans, wine by the glass and the
  bottle, cocktails, coffee and the soft drinks. Beers carry a gluten warning,
  and where a tap lists a bigger pour without saying what size it is, the menu
  says so rather than guessing. **1841 doesn't publish a drinks list at all**, so
  it has none. Both pubs keep their **$$** price band — left to itself the
  arithmetic would have called them as cheap as a takeaway, because most drinks
  cost less than most mains.
- **Three pubs join the list** — **1841 Bar & Restaurant** in Johnsonville,
  **The Borough** in Tawa and the **Southern Cross** in Te Aro, with full menus:
  164 dishes between them, plus hours, phones and directions. The Borough's
  **Burger Wellington** entry, The Aegean Melt, is in for its run and will drop
  off the menu by itself once the festival ends on 23 Aug. 1841's prices come
  from the venue's own menu PDF and are dated **March 2025** in the data — the
  most recent reading anyone has published, and old enough to be worth checking
  at the counter.
- **Pandan Asian Cuisine** — 90 dishes across Malaysian, Indian and Asian menus,
  read from the restaurant's own online ordering. **Both branches** are listed —
  Melling in Lower Hutt and Press Hall on Willis Street — sharing the one menu,
  so whichever is nearer is the one you get directions to.
- **The three new Johnsonville places now have addresses, hours and phone
  numbers**, so they show up in "Open now" and sort properly by distance.
- **Three new Johnsonville places** — **Noodle Canteen**, **The Ramen Shop** and
  **BurgerFuel** — and **Wellington Kebab Grill** goes from "menu coming soon" to
  its full board: 75 items across kebabs, iskender, shawarmama boxes and the rest.
  All read in the shops on 15 Aug 2026. <!-- datescan:allow: quoted content date — the day the menus were read, as the site prints it -->
- **You can now see, at a glance, whether to trust what you're reading.** The
  little icon beside a restaurant's name used to appear only when something was
  wrong. Now it's always there and tells you which way it went: a blue ⓘ for
  "menu and prices checked in store on 15 Aug 2026", an amber ⚠ when the menu <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it -->
  needs a refresh and why. Where we've also checked the phone number, address and
  opening hours, it says so — and where we haven't, it stays quiet about them
  rather than implying otherwise. (ADR 0037)
- **Prices are stated as New Zealand dollars.** In the same icon, and under
  **Prices** in About. Not tacked onto every price — just somewhere obvious if
  you ever wonder.

### Changed
- **Thai Tara Express has repriced, and you can see both prices.** Its new menu
  card is dearer across the board (pad thai $14.50 → $21.50), and it now closes
  between lunch and dinner. Nine dishes have gone and several were renamed; none
  of the old records were thrown away, so the price history is intact.
- **The "needs a refresh" warning now means something.** It used to appear on
  almost every place, because it fired whenever nobody had recorded a check —
  so it was easy to stop seeing. Now it asks *who told us*: if the prices came
  from the place itself (someone in the shop, its printed menu, its own site, or
  a phone call) and we read them within the last year, there's no warning. If <!-- datescan:allow: a rolling window (VERIFY_MAX_AGE_MONTHS = 12), not a dated claim — the caveat is computed against the reader's own now -->
  they came from a delivery app or someone else's listing, the warning stays and
  now says so — "These prices came from a delivery app, not the place itself" —
  because delivery prices are often marked up. And a check that's aged out says
  that instead. TJ Katsu and Sushi Bi now carry the dates we actually read them
  on. (ADR 0036)

### Added
- **Cook mode.** Open a recipe, tap **Cook mode**, and the method takes over the
  whole screen one step at a time — big type you can read from across the bench,
  a "Step 3 of 9" counter, and Back/Next buttons sized for floury thumbs (arrow
  keys work too). **Your screen stays on while it's open**, so a glance at step 5
  no longer starts with drying your hands, and the phone goes back to normal the
  moment you close it. Ingredients are one tap away inside cook mode and put you
  back on the step you were on. On phones too old for the screen-awake feature
  (iOS before 16.4) everything else works exactly the same, quietly.
- **A menu now says *how* we checked it, not just when.** The date under a
  restaurant's name reads "Read in store, 7 Aug 2026" or "Read from a paper <!-- datescan:allow: quotes the string the app renders to a reader; the UI's human date format is a product choice, not a dating slip -->
  menu, 8 Aug 2026" — because someone standing at the counter and a listing <!-- datescan:allow: quotes the string the app renders to a reader; the UI's human date format is a product choice, not a dating slip -->
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
- **Settings → Refresh & reset → "Refresh menus and app"** — the escape
  hatch for when something still looks stale. It throws away the offline copy
  of the menus and app code and downloads the lot again. Your favourites,
  ratings, settings, profiles and order tally aren't touched, and it won't
  run when you're offline (clearing the copy with no connection would leave
  you with no menus at all).
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
- **About's version stamp now matches what's actually on screen.** It used to
  be able to show a newer version than the page you were looking at, in the
  gap between a background update arriving and you tapping Refresh. Now it
  asks the running app directly, and adds a separate "an update is ready"
  line when one is waiting for your tap.

### Fixed
- **The order sheet and share sheet titles no longer render in small caps.**
  `.order-head` was defined twice in `app.css` — once as the order/share sheet's
  header bar, once as the menu screen's small uppercase "Order online" label —
  and the later rule won, so sheet titles picked up the label's uppercase,
  shrunk styling. The menu label is now `.order-block-head`; the sheet header
  keeps `.order-head` for the order, share, receive and transfer sheets.

### Changed
- **One word for one thing: everywhere you eat is a "place".** The app used to
  call the same thing a place, a venue, a restaurant or a spot depending on
  which screen you were on — it's a **place** now, throughout. One of a
  place's locations is still a **branch**, because that really is a different
  thing, and Settings → Distance now says so out loud: "Hide places further
  than" (which places you see at all) sits above "Show a place's branches
  within" (how many McDonald's show on one contact card). They used to read
  like two dials for the same job. The te reo Māori labels moved in step.
  (ADR 0035)
- **Settings → "Your data" is now two rows.** Its one-line summary had grown
  to naming five actions (export, import, transfer, refresh, reset) as each
  landed. Export/import/transfer — moving your saved picks in, out or across
  devices — stay under "Your data"; the app-cache refresh and the preferences
  reset move to a new "Refresh & reset" row. Both panels open, confirm and
  work exactly as before; nothing moved lost its confirmation step. (ADR 0033)
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
  draws a single pixel, so you see tonight's menu at tonight's prices and <!-- datescan:allow: product vocabulary — "tonight's menu" is the question this app answers, not a dated claim -->
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
