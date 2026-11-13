- **2026-08-09 (owner reframes the time dimension — addendum to the 2026-08-08
  session above)**: Owner clarified the *purpose*, which changes how the roadmap
  should read even though no code moved. Raw: *"capturing price trends is not the
  core function of this app but its valuable data that can be gathered while we
  do this. As we build up enough data we will consider how we use that both in a
  dedicated section of the UI (e.g. research basis etc) and as useful info to the
  user in the apps main purpose e.g. coffee price changing tomorrow"*. <!-- datescan:allow: verbatim owner quote — the record must not paraphrase what he actually said -->

  **What that settles.** The history is a **by-product of work already being
  done** — every menu refresh is a dated reading — not a feature the app is for.
  So the sequencing is: capture now because it is the one thing that cannot be
  retrofitted; build the surfaces if and when the data earns them. The previous
  Theme 13 wording ("the features that model exists to make possible") had the
  emphasis backwards and was rewritten.
  **Two surfaces, different bars**, now recorded as such: (A) a *dedicated
  section* — research/analysis, opt-in, off the main path, free to be denser;
  (B) *inline in the primary flow* where it changes what you order (the owner's
  "coffee is $6 from tomorrow"), which must earn its pixels against the core job.
  ⚑ Owner's call deliberately deferred: **when there is enough data, and which
  surface first.** Baseline recorded so a future session isn't guessing: **1 of
  31 venues** has more than one price reading (Churton, 174 dishes); **2 of 31**
  carry a `verified` date at all. Not yet, by a distance.
  🔎 **The gap this exposed, and the real work of this addendum.** The by-product
  only accrues if refreshes *append*. Nothing said so anywhere — and the failure
  is not hypothetical: the Churton refresh discarded seven years of prices in one
  commit the day before, recoverable only because git happened to hold them. A
  future refresh would have done it again, and the next one would have had no git
  history to rescue it. Now written in `ARCHITECTURE.md` ("Refreshing a menu" —
  six numbered rules) and in `CLAUDE.md`'s lockstep list where a session actually
  looks before touching menu data. The rule that matters most is the one
  separating a **change** from a **correction**: *did the shop change it, or did
  we?* Recording a correction as a series fabricates a price rise — the exact
  trap the Gold Lining cookie sidestepped by judgement rather than by rule.
  Docs only; no code, no data, no schema change. Verified: validate 31 files
  valid; node --test 372 pass (the count moved from 363 — a concurrent session
  landed more while this was open); no-deps; SBOM; floor green. No SW bump:
  confirmed nothing under `site/` changed.

