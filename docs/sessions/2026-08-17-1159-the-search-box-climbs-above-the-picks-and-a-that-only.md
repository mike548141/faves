## 2026-08-17-1159 — the search box climbs above the picks, and a ✕ that only speaks for one place

**Two asks off one screenshot of Cook at Home, and a third that arrived mid-
work as a scope ruling on someone else's theme.** Shipped `c573035`; the ruling
recorded at `268c366`.

**Ask 1 — search above "If it's your first time, try…", on all pages.** Checked
the population before moving anything: `renderPicks` exists only in `menu.js`,
so the collection/menu screen is the *only* page that has both. Home's search
already sits at the top of `<main>` and the recipe page has no picks block. So
"all pages" is one page, and saying so is more useful than quietly doing one
and implying three.

The order now runs **toolbar (search + jump-nav) → dietary chips → picks →
menu**, not picks first. The picks did not go directly under the toolbar
because the chips are the rest of the control cluster: splitting the controls to
slot content into the middle of them is the shape that made the search hard to
find in the first place.

**Ask 2 — a ✕ that closes the block.** It is remembered, and remembered **per
venue** (`settings.picksClosed`, an id list). The precedent in this repo is
`ingredientsFolded`, which the owner ruled should be **global**, and this is
deliberately not that: an ingredient fold reopens in one tap on the page it was
closed on, and this block does not come back at all — so a global flag would
answer a question asked about one place by silencing all 55. It rides the
settings store for `ingredientsFolded`'s stated reason (a brand-new `faves.`
key is swept into the backup export and then never restored), which also means
`MERGE_SETTINGS_FIELDS` picks it up for free, being derived from `DEFAULTS`.

🚩 **There is no undo, and that is the one thing I did not decide for him.**
Closing is permanent for that venue. The honest options are a `⋯` menu item that
appears only when the block is closed, or a Settings reset; both are small, and
neither is worth building before he says whether the permanence bothers him.
The `CHANGELOG` entry says plainly that there is no way back yet rather than
letting the reader find out.

**`tools/picks_check.mjs` — the thirteenth browser check, 14 assertions.** Two
claims here are invisible to a unit test in different ways:
- **An order between two elements built in different halves of `render()`** and
  appended in a third place. Asserted in document order *and* in paint,
  separately, at 390 px and 1200 px — `position: sticky` and the two-column
  grid can both put a later element higher up the page, so one of those two
  assertions passing is not the owner's claim.
- **"Remembered" and "per venue" fail independently.** A global flag passes
  every *it stayed closed* assertion; a session-only flag passes every *it
  closed* assertion. So the check reloads, and then opens a second venue.

🔎 **Two harness traps worth writing down, both of which produced a confident
wrong answer first.**
1. My first `until()` waited for `.menu-search, .menu-status` — and
   `.menu-status` is the class on **"Loading menu…" in `restaurant.html`'s
   static markup**. The wait returned before a line of the menu was drawn, and
   two assertions failed against a blank page. A readiness predicate that can
   match the *pre*-render placeholder is not a readiness predicate.
2. The store is **profile-scoped**, so it lives at `faves.p.<id>.settings.v1`,
   not `faves.settings.v1`. Reading the unsuffixed key reported *"not
   persisted"* about a value that persisted perfectly well — and the reload
   assertion two lines below was passing at the same time, which is what
   flagged it as my bug rather than the app's.

✅ **Both halves break-probed, per the house rule.** Restoring the old append
order fails 5 assertions and nothing else; replacing the `settings.set` with a
no-op fails exactly 2 (*written to the store*, *still closed after a reload*).
The focus assertion was **not** break-probed — said plainly, because "every
assertion was verified by reintroducing its bug" is the claim that quietly
stops being true one addition at a time.

**Ask 3, mid-session — Theme 14's scope, in his words:** *"the same feature
should work for many scenarios… sauces to put on it, things to remove from the
dish, a different milk in a coffee, to upsize something, sides on a breakfast,
a combo… essentially the ability to customise or add to a dish."* Recorded on
the Theme 14 item with the six scenarios scored against what is actually built,
because three of them are decisions and not tasks:
- a **structured removal** reopens 14c's components half, which shipped as free
  text on the deliberate grounds that structure was not yet justified;
- **"upsize"** is now claimed by both this theme and Theme 28's portions
  question, and two themes modelling one shape is how the corpus gets two;
- a **substitution** is the only one of the six that *removes* an allergen as
  well as adding one, and `composeTags` unions on the way in with no way out.
I did not design any of it — this is a ruling landing on a queued theme, and
the right move was to make the consequences visible to whoever takes it.

