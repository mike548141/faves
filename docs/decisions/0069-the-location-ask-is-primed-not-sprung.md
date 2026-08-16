# 0069 — The location ask is primed, not sprung

**Status:** Accepted. Supersedes **item 4 only** of
[0068](0068-the-home-list-ranks-on-one-blend.md); items 1–3 of that record stand
untouched.

**Date:** 2026-08-17

## Context

[ADR 0068] ratified one home-screen ranking with distance in it, and item 4 said
how the app would get the location: `getCurrentPosition` fires on load, first
visit, no explanation, and a refusal is silent — *"no error, no nag and no
second ask"*. Its Consequences section named the risk and named the remedy:

> 🚩 The known risk: an unexplained geolocation prompt on load is the classic
> route to a **permanent** denial […] If the deny rate looks bad in use, the fix
> is a priming affordance **before** the prompt, not moving the prompt.

That remedy has a trigger that can never fire, and this record exists because
the trigger was checked rather than assumed.

**Finding 1 — there is no deny rate to look at.** Faves ships no analytics, no
telemetry, no beacon and no backend. `grep` over `site/js/` finds exactly two
`fetch` calls, both in `data.js`, both loading our own menu JSON. Nothing in the
app has ever reported anything about a visitor to anyone. So *"if the deny rate
looks bad in use"* is not a deferred decision — it is a decision that would sit
deferred forever, and the on-load prompt would be permanent by default rather
than by choice. A safety-valve nobody can read is this repo's recurring
decorative-guard fault wearing a different hat: a check that cannot fire is a
check nobody reads, and here the thing that cannot fire is a *revisit*.

**Finding 2 — the app cannot tell "never asked" from "blocked forever".**
`navigator.permissions` appears nowhere in `site/`. Both states present
identically to the code: no origin, no distance, nothing on screen. So the one
observation that *would* be available locally — this device has blocked us — was
not being made either, on the owner's own phone as much as anyone's.

**Why this is worse than it sounds.** A first visit is the moment of least
earned trust and least context: the shell is still installing, nothing on screen
is personalised, and the visitor has not yet seen the list the location is
supposed to improve. It is also the moment a browser prompt is cheapest to
dismiss. And the dismissal is asymmetric — an *ungranted* permission costs one
tap to obtain later; a *denied* one is sticky, survives reloads, and is undone
only by digging into per-site browser settings that most people cannot find.

## Decision

Both halves were put to the owner on 2026-08-17 with the costs stated, and both
were ruled.

**1. The ask is primed. Nothing is sprung on load.**

- On load, the app queries `navigator.permissions.query({ name: "geolocation" })`.
  This asks the *browser* about state; it never prompts the visitor.
- **`granted`** → call `getCurrentPosition` immediately and rank with distance.
  No prompt appears, because the permission is already held. A returning
  visitor who once said yes gets the full ranking with zero taps, forever.
- **`prompt`** → the list renders in the no-origin order (availability →
  favourite float → curated, i.e. exactly today's) and a visible one-tap control
  offers to rank by distance. **Tapping it is what raises the browser prompt**,
  so the prompt only ever arrives after the visitor asked for the thing it is
  for.
- **`denied`** → the no-origin order, and the control is replaced by a short
  line saying location is blocked for this site and roughly where to turn it
  back on. Stated once, in place, never as a nag or a modal.
- Where `navigator.permissions` is unsupported, treat it as `prompt`. The
  degradation is to the affordance, which is the safe direction.

**2. Refusal is still silent, and that is not in tension with the above.**
[ADR 0068] item 4's *"no error, no nag and no second ask"* is kept literally for
the case it was written about: a visitor who taps the control and then says No
gets the existing matter-of-fact status line and is not asked again. What
changes is that the app now also renders the *`denied`* state — which is not a
nag, because it is a fact about the browser that the visitor can act on, shown
where the control that no longer works used to be.

## Consequences

- **The visible win of [ADR 0068] is smaller.** That record's headline
  consequence was *"the filter row loses a whole control"*. It still loses the
  SORT BY group — one ranking, no sort `<select>` — but gains a single location
  affordance. Net: one control fewer, not two. The owner took this knowingly;
  the trade is a control for a permission that survives.
- **On a first visit distance does nothing until someone taps, once, ever.**
  This is the real cost and it was named in the ask. It is bounded by
  `permissions.query`: the tap is once per browser, not once per visit.
- **This is still the first permission prompt in Faves' history** — it is now
  user-initiated, which changes its character but not its novelty. The
  [ADR 0045](0045-prices-convert-and-localisation-can-follow-you.md) constraint
  is unchanged and load-bearing: the permission is requested for ranking, used
  for ranking, and is a licence for nothing else. It must not become an input to
  currency, to the reo chrome, or to anything else without its own record.
- **`permissions.query` is a genuinely new browser API for this codebase.** It
  is feature-detected, and its absence falls back to the `prompt` branch, so no
  path depends on it existing.
- **Nothing here is measured, and that stays true.** The fix for the missing
  deny rate is not to start collecting one — that would be a backend and a
  tracking surface, against the app's whole shape. The fix is to not need it,
  which is what priming does.

## Rejected

- **Ship item 4 as ratified and revisit if the deny rate looks bad.** The
  option as written, and the one this record supersedes. Rejected on Finding 1:
  the condition is unobservable, so "revisit" resolves to "never" while reading
  like a plan. 🔑 **The general rule worth carrying: a deferred decision whose
  trigger nothing can observe is not deferred, it is taken — and taken quietly,
  which is the part that makes it a problem.**
- **Silence on `denied`, per item 4 read literally.** Put to the owner and
  declined. It leaves a visitor — the owner included — with an app that
  permanently and invisibly declines to use a feature it has, and no surface
  anywhere explains why. Silence about a *choice the visitor made* is courtesy;
  silence about a *state they may not know they are in* is a defect.
- **Prompt on the second visit rather than the first.** Put to the owner and
  declined. It buys a little earned trust and needs a visit counter, a
  persistence decision and a fresh set of edge cases, and the prompt still
  arrives unexplained when it finally arrives — the actual complaint, unfixed.
- **A priming *dialog* (explain, then prompt).** Not put to the owner; ruled out
  against the house pattern. Faves has no modals on the home screen and an
  interstitial explaining a permission is a worse version of a control that
  simply says what it does.

[ADR 0068]: 0068-the-home-list-ranks-on-one-blend.md
