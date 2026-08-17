- [x] **36d — the timer's alarm** ✅ SHIPPED 2026-08-16

> ✅ **BUILT AND MERGED 2026-08-16 (wt: faves-cook, merge `42b1a7a`)** — all
> three channels, exactly as ruled. Recorded as **ADR 0071**. `site/js/alarm.js`
> is new; `cook-ui.js` arms the audio context and raises the ask inside the
> start tap; `sw.js` answers `notificationclick`. 25 unit tests, 15 new
> `cook_check` assertions, **`cook_check` OK — 75 passed**.
> 🔎 **Three of the new assertions were proved by breaking them** — inverting
> the 15-minute guard failed exactly the two notification assertions, dropping
> the vibrate call failed exactly the five vibration ones and left the tone
> green. 🛑 **And one new assertion was found to be decorative and replaced:**
> the ring-once guard could not bite, because the tick that rings the last timer
> also stops the interval — so deleting the guard failed nothing. Replaced with
> a two-timer scenario. *An assertion nobody has watched fail is not yet a
> guard*, and this one was written in the same session that was hunting
> decorative guards elsewhere.
> ⚠️ **Three things a green run does not show, and the ADR says so:** no real
> speaker was heard, no real motor was felt, and iOS ignores `navigator.vibrate`
> entirely — so on the owner's own phone this feature is tone plus notification,
> never a buzz. He was told and chose it anyway.
> 🎯 **Three left for the owner** — see the questions at the end of this block.

**Ruling as given, for the record.** It lives in
`cook.js`/`cook-ui.js`/a new `alarm.js`/`sw.js`.

⚠️ **This claim originally asserted file-disjointness from the live peers, and
that sentence was false within the hour.** It read *"none of which 37c/d/e/j/l/m
(wt: faves-recipe), 37g (wt: faves-ranking) or 37n (wt: faves-allergens)
touch."* Then 37l's own ADR landed and pulled **`cook-ui.js`** into its
blast radius — one statement at ~line 116, where the ingredient array becomes a
call to a new `ingredients.js`. Corrected in place rather than quietly, because
a claim that states disjointness is precisely what the next session trusts
*instead of* re-checking. 🔑 **Disjointness is a measurement with a timestamp,
not a property of a claim** — the roadmap already says one level up that 36a and
37l are *"different roadmap items and the same edit"*, and this claim made the
same mistake about itself while citing it. Two sessions each holding a correct
map of their own files still had a collision neither could see; what found it
was a third session noticing they had both answered the same broadcast.
**Settled with faves-recipe:** `cook.js` is faves-cook's entirely; `cook-ui.js`
is faves-cook's outright *except* that one statement and its import, which
faves-recipe lands first so this session rebases onto a settled file.

Owner ruled the shape in full, going further than the recommendation:

- **A tone on every timer.** Generated in code (Web Audio `OscillatorNode`) —
  no asset, no precache entry, no network, and no permission. The tap that
  starts the timer is the gesture that unlocks the `AudioContext`, so autoplay
  policy is satisfied without asking for anything.
- **Vibration on every timer.** `navigator.vibrate`, also permission-free.
  ⚠️ **iOS Safari ignores it entirely**, so this half does nothing on the
  owner's own phone — an Android-only benefit. He was told and chose it anyway;
  recorded so it is not later read as an oversight.
- **A notification as well, for timers over 15 minutes.** This is the posture
  change: it needs `Notification.requestPermission()` — the **first permission
  prompt Faves has ever shown** — plus a service-worker path. Accepted
  knowingly.
  🚩 **Ask at the moment a long timer starts, never at page load.** A cold
  prompt on arrival is what trains people to refuse. And degrade silently: no
  permission means no notification, with tone and vibration still firing.

Write the ADR when built — first permission prompt, first audio, first
vibration, three firsts in one feature.
⚠️ **"First permission prompt" was not written into ADR 0071, deliberately.**
ADR 0069 (the location ask, wt: faves-ranking) claims the same superlative, and
the two were built **concurrently in different worktrees on the same day**.
🔑 **A superlative is a claim about every other change, including ones being
written in parallel that the author cannot see** — it is unverifiable from
inside the repo and it decays without anyone touching the file it sits in. 0071
says the two were concurrent and that merge order settles nothing worth
asserting. Peer sessions carried this into ADR 0072 as a face of the same
family.

**🎯 Three questions put to the owner — ✅ ALL THREE ANSWERED 2026-08-16:**
1. ✅ **A notification fires even when you are looking at the page — RULED: LEAVE
   IT, duration only.** The condition stays *over fifteen minutes* and nothing
   else. He took the redundant-notification cost knowingly, over an offered
   "only if the tab is hidden" alternative. 🔑 **His reasoning generalises and is
   worth keeping**: a rule with one condition is predictable; a second condition
   buys quiet and costs predictability, and "hidden" is a poor proxy anyway — a
   phone locking mid-bake counts as hidden. **Nothing to build.** ADR 0071's
   rejected-options list already records the alternative; it is now rejected by
   the owner rather than by the agent's restraint.
2. ✅ **No visible cue at all — RULED: BUILD IT, and style the blocked line
   too.** `[S][css]` **OPEN AND UNCLAIMED — the next session should take this.**
   Two parts, one small CSS pass in `app.css`:
   - a **finished timer's card visibly changes** (the timer face reaching zero
     must be legible without sound), and
   - the notifications-blocked line gets **its own styling** instead of borrowing
     `.cook-awake` via the `.cook-notify-blocked` hook already in the markup.
   🚩 **Why this is the highest-value of the three, in his own case:** iOS Safari
   ignores `navigator.vibrate` entirely, so on the owner's own phone the alarm is
   tone plus notification. **A silenced phone with notifications denied currently
   gives no alarm at all** — and a silenced phone in a kitchen is the likely
   case, not the edge case. Verify at 390 px and extend `cook_check.mjs`.
3. ✅ **`cook.notifyBlocked` has no te reo string — RULED: to the reo queue.**
   Add it to `docs/reo-review-queue.md` as a `// draft` string in `reo.js`; it
   falls back to English safely until then, so nothing is broken meanwhile.

⚠️ **Vibration is NOT gated on `prefers-reduced-motion`, and that was a
judgement call worth challenging.** `settings.js` has no quiet/haptics
precedent, and the preference is usually set for vestibular reasons — silencing
the buzz could leave a reader who cannot hear the tone with no perceivable
alarm at all. Recorded as a rejection in 0071 rather than taken silently.
