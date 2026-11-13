## 2026-08-16 03:13 UTC — the browse sweep, delivered

**Ask.** Continuation of the session above: the owner kept browsing the live
site and raising things. Six more items, each triaged on his standing rule —
deliver it, or queue it if it wants a session of its own.

**Delivered.** The search hints held for 4 s, which read as restless; they now
hold about 7 s (**7425 ms measured live**) and cross-fade rather than snapping.
The fade is a class toggle plus a CSS transition on `::placeholder`, not a JS
animation, with `FADE_MS` and the CSS duration paired and commented. The
failure mode worth guarding is a placeholder left invisible when someone taps
the box mid-fade — every pause path goes through `settle()`, and focus, typing
and `stop()` each have a test.

The allergen ⓘ carried three defects in one screenshot. Its halo was a
`background` on the 44 px button, so it painted a block, off-axis in the
settings row where the glyph is left-aligned; it is now a `::before` circle
centred on the glyph, **31 px measured**, tap target unchanged. Its note was an
absolutely-positioned popover inside a scrolling dialog, so it ran past the
edge and lost its last line; inside Settings it now sits in flow — **356 px
inside a 390 px dialog, no overhang**. Its copy went from 60 hedged words to 50
plain ones, with the two things that must not be misread in bold. Every safety
point survived the trim and the code names them so a later edit cannot shave
one off by accident.

The order-number badge moved to the right of the dish name — leading with it
made every row start on a number, and the accessible name read "#1 Wonton
Soup". The update prompt says what the reader gets ("An update is ready, with
the latest menus and prices") rather than what the software is.

**The one with real data behind it.** "Menu coming soon" venues were unlinked
and had their open/closed badge explicitly suppressed. We hold far more than
the card admitted: of 23 stubs, **19 have an address, 19 coordinates, 12 hours,
9 a phone** — all 23 carry at least one. All 23 now open, and **15 now show a
live badge** such as "Closed · opens 5pm". The suppression was also redundant:
`openStatus` already reports `unknown` without hours, so removing it reveals
only the venues that genuinely have them. And the standing "Read in store"
line, which appended the verification date, came off the venue page — it
repeated the ⓘ above it, which carries that date plus what was checked and how.


**Answered without a change.** Cuisine search already worked — `cuisine` has
always been in the place haystack. "Mexican" returns nothing because there is
no Mexican venue in the collection, which is a data gap, not a search one.

**Queued.** Theme 23c — the same outcome answered on two screens: Refresh lives
in Settings, the version evidence in About, and "am I up to date" is one
question. Theme 23d — card density, and what should scale with screen size;
noted there that hiding a chip no longer hides the fact, since the search index
now covers services and cuisine.

**Verification.** `node --test` **621**; `validate.py` 45 files 0 errors;
`device_check` 19/19; `cook_check` 36/36; and three purpose-built live runs in
headless Chrome at 390 px — the cross-fade 6/6, the ⓘ geometry 7/7, and the
stub cards measured on the real home screen. `SHELL_VERSION` → 2026-08-16.10.

**A harness lesson worth keeping.** Two live checks reported false failures
before they reported true ones: one measured the hint interval from page load
(load latency ate the window) and one waited on `li.card`, which the **no-JS
fallback `<ul>` already satisfies**, so it read the static mirror instead of the
rendered list. On a fail-soft page, wait for a JS-only signal — `body.app-ready`
or an unhidden control — never for markup the fallback also provides.

