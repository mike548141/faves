# 0083 — The location ask explains itself, and can be turned off for good

**Status:** Accepted. Supersedes **the surface half** of
[0069](0069-the-location-ask-is-primed-not-sprung.md); 0069's core protection —
never spring the *browser's* prompt — is kept whole and restated below.

**Date:** 2026-08-17

## Context

[ADR 0069] shipped on 2026-08-17 and made the location ask a single inline
control: a "Use my location" pill above the venue list, no explanation, no
second surface, and *"never as a nag or a modal"*. Within hours the owner looked
at it on his own phone and asked for something materially different:

> *"If the user has not given permission lets pop up a window/message to explain
> why its valuable to share their location and that their location data never
> leaves the device. Let them to continue to the site without giving permission,
> and have a tick box to say don't keep prompting me i.e. no nagging. If they
> continue to Faves without sharing location data and they don't tick the box to
> not nag them then show a banner at the top of the page to ask for permission."*

and, separately, on seeing the pill:

> *"I don't like the 'pill' button to prompt for location data, remove it."*

**The apparent contradiction, and why it is not one.** 0069's central evidence
was that an unexplained geolocation prompt at the moment of least earned trust
is the classic route to a **permanent** block — and a block is sticky, undone
only in per-site browser settings. That argument is about the **browser's**
prompt. What the owner asked for is *our* dialog, which cannot deny anything:
it explains first and raises the real prompt only when someone presses Allow.
So this is not a reversal of 0069's protection. It is the **priming affordance
[ADR 0068]'s own Consequences section asked for** — *"the fix is a priming
affordance before the prompt"* — finally built, with 0069's inline pill turning
out to be too quiet a form of it.

**Where 0069 was genuinely overruled.** Two places, both stylistic rather than
structural: it ruled out a modal, and it ruled out any second surface as a nag.
The owner overruled both, and bounded the second himself with the tickbox — so
the banner is a nag *the reader can end permanently*, which is a different
object from the unbounded one 0069 refused.

**A timing question 0069 never had to answer.** Put to the owner with the
trade stated — first load is most visible, but is the moment of least trust and
is what Google's intrusive-interstitial policy penalises on a mobile search
landing. He ruled:

> *"Load the full page so they can see everything and sort to the best of Faves
> ability without location data sharing. Then ask for location data sharing so
> they can see why its needed."*

## Decision

**1. Nothing is asked until the list is on screen and readable.** The home list
renders in the no-origin order first; the dialog opens after it, behind two
animation frames and a short beat. The reader sees the thing location improves
before being asked to improve it.

**2. The ask explains itself, and states the privacy position.** The dialog says
what location buys and that *"your location never leaves your device — Faves has
no accounts and no servers to send it to."* 🔑 **That sentence is verifiable, not
marketing:** the app makes exactly two network requests, both in `data.js`, both
for our own menu JSON. No analytics, no telemetry, no beacon, no backend. If
that ever stops being true, this sentence is the first thing that must change.

**3. "Don't ask me about this again" binds BOTH surfaces, forever, on this
device.** Not the dialog only, not for this session. `geo-consent.js` owns the
flag and `askSurface()` owns the decision table; suppression outranks everything
except an already-granted permission.

**4. Declining without ticking demotes the ask to a banner.** Dismissing the
banner is the second refusal and suppresses permanently — two noes is a no.

**5. The pill is removed.** With it gone, **Settings → Location** is the only
route back, and it is therefore load-bearing rather than a convenience: without
it the tickbox would be a trapdoor, turning a feature off with no visible way to
turn it on. It reports three distinct states (on / blocked by the browser /
off), because collapsing them is the fault 0069 was written to fix.

**6. A modal never lands on a reader who has already started.** If a scroll,
pointer or key event has happened before the beat elapses, the banner is shown
instead of the dialog. `showModal()` makes the rest of the page inert and pulls
focus, so a dialog opening at 900 ms would take the page away from someone
mid-tap — which is *asking too early* by a different route than the one the
owner's ruling addressed.

**7. 0069's protection is kept verbatim.** `permissions.query` reads the state
without prompting; the browser's own prompt is raised only by a button someone
pressed; a `denied` state produces no dialog and no banner, only the status
line; and where `navigator.permissions` is missing we degrade to the affordance,
never to silence.

## Consequences

- **Decision 6 was found by measurement, not by reasoning.** Opening the modal
  unconditionally broke two unrelated browser checks — `to_top_check` could not
  focus the tucked ↑, and `filter_row_check` reported every filter control as
  *"blocked by DIALOG"* with focus moved to this dialog's checkbox. Those were
  not test artefacts; they were the first honest report of what a modal does to
  a reader who is already using the page.
- 🔑 **Removing an element breaks the checks that name it, and that is the good
  case.** `filter_row_check` drove `#geo-ask` directly and **crashed on a null**
  when the pill went. Loud, immediate, one line to fix. A check that had gone on
  passing against an element that no longer existed would have been far worse —
  the decorative-guard pattern this repo keeps rediscovering ([ADR 0072]).
- **`tools/geo_check.mjs` joins the browser-check family as the eighth.** It
  exists because the tickbox makes a *promise*, and a promise fails in the
  wiring rather than in the logic: a listener on the wrong element, a flag read
  before it is written, a `close` event firing twice. Each of those leaves the
  pure decision table green. Its own assertions were verified by reintroducing
  the bug they cover.
- **Two checks now seed the consent flag before page scripts run.**
  `filter_row_check` and `to_top_check` set `faves.geo.consent.v1` via
  `Page.addScriptToEvaluateOnNewDocument`. This is isolation, not evasion — the
  same removal of an unrelated variable as using a fresh profile to escape a
  stale service worker, and it puts them in a state the product itself supports.
- **Seven English-only te reo keys are owed**, listed in
  `docs/reo-review-queue.md`. 🚩 `geo.private` is flagged there as the one that
  must not be approximately translated: it is a privacy claim, and a wrong
  translation of it is an untrue promise rather than a cosmetic fault.
- **A dead `distancePanel` was found and deleted** while adding the Settings
  control. It had been orphaned by the 2026-08-16 two-panel consolidation, read
  as the live home of the distance dials, and owned nothing — appending an
  element *moves* it, so the panel built later held the rows. The next person to
  add a distance control would have added it there, which is exactly what
  happened here before the browser check caught it.
- **The consent flag is deliberately outside the backup export.** A promise not
  to nag is about this device and this browser, and the permission it shadows is
  per-origin-per-device. Restoring it onto a fresh phone would silence an ask
  that phone never declined.
- **What is knowingly not settled:** whether 900 ms is the right beat. It is
  asserted as an *order* (list first, ask second) and never as a feel, and no
  headless check can tell us more than that.
