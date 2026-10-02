- [~] 🚩 **No branch of McDonald's or Subway has opening hours** `[M][content]`
      — ~~**10 of the corpus's 22 branches**, measured 2026-08-16~~ →
      **10 of the corpus's 47 branches**, re-measured 2026-09-09. This is now
      load-bearing rather than cosmetic: [ADR 0054](../../decisions/0054-the-branch-offered-first-is-the-nearest-open-one.md)
      picks the branch that leads a chain's contact card by *"nearest, and
      open"*, and with no hours anywhere on those two chains the openness half
      of the rule can never fire for them. The three-state design means the card
      degrades honestly — no branch is labelled open or closed on a guess — but
      the feature the owner asked for is only half-alive until the hours land.
      Both chains publish per-store hours on their own store-finder pages.
      Capturing them makes ADR 0054 real and lets `branch_check.mjs` exercise
      tier 1 on a venue that has more than one state.
      🛑 **Attempted 2026-08-16 and BLOCKED — on tooling, not on the data
      existing.** Nothing was written; both records are untouched. What was
      established, so the next attempt starts here rather than repeating it:
      - **McDonald's has a real first-party per-store page** — e.g.
        `mcdonalds.com/nz/en-nz/location/wellington/lambton-quay/276-278-lambton-quay/640045.html`,
        address and phone confirmed against our stored branch. It renders a
        "Store Hours" section and even computes a live "We're closed now"
        status. **The weekly table never appears in the DOM** — not in a plain
        fetch, not in headless Chromium or WebKit at 15 s, no `<iframe>`, no
        JSON-LD, no state blob, nothing in the meta description. It reads as a
        widget that populates only on a genuine click. The `googleappsv2`
        geolocation endpoint and `mcdonalds.co.nz` both return
        `ERR_HTTP2_PROTOCOL_ERROR` to every engine tried.
      - **Subway NZ appears not to be on a readable first-party platform at
        all**: `subway.com/en-nz/findastore` is JS-only with no server-rendered
        results, `subway.co.nz` is dead (TLS mismatch onto a bare edge), and
        `restaurants.subway.com` serves other regions — a search for
        "Wellington" returned the one in Somerset.
      - **Third-party sources were found and deliberately refused.** Several
        aggregators carry confident-looking hours for both chains. Taking them
        would put a guess behind ADR 0054's "open" state, and a false "open"
        sends someone across town — the failure the three-state design exists to
        avoid. `unknown` remains the honest state.
      - **Coordinates:** the two branches missing a pin (McDonald's Courtenay
        Place, Subway Mulgrave Street) both geocode to a **street centroid**
        only, so both were left empty on the Pandan precedent. Also noted, not
        acted on: McDonald's Johnsonville's *existing* pin sits 359 m from a
        fresh geocode — but that geocode is street-level too, so it is not
        evidence to move it.
      🎯 **This needs an owner decision, and there are three honest options:**
      (a) he supplies the hours himself, or authorises someone to read them off
      the stores' own doors or by phone — the corpus already has an `in-store`
      and a `phone` provenance tier for exactly this; (b) a session runs with an
      interactive browser that can click, which is a tooling change, not a
      content one; or (c) he rules that a named third-party source is acceptable
      for opening hours specifically, recorded with its own provenance value so
      the weaker basis is visible on the record rather than laundered into
      first-party. **Option (c) changes a standing rule and is his call alone.**
      Claim released — this is not blocked on effort and re-attempting it with
      the same tools will produce the same result.

  📏 **COUNT RE-MEASURED 2026-09-09 — the denominator moved, the problem did
  not.** The corpus now holds **47 branches across 12 venues**, not 22. The
  numerator is unchanged at **10**, and they are still exactly the same ten:
  all **5 McDonald's** and all **5 Subway**. Nothing else in the corpus is
  missing hours — the other 37 branches all carry them.
  The command, so the next reader re-runs rather than inherits:

  ```
  python3 -c "import json,glob
  n=[(json.load(open(f)).get('id'),i) for f in glob.glob('site/data/restaurants/*.json')
     for i,b in enumerate(json.load(open(f)).get('locations') or []) if not b.get('hours')]
  print(len(n))"
  ```

  🔑 **Why the correction matters in the right direction.** *"10 of 22"* reads as
  **45% of the estate broken**; *"10 of 47"* is **21%**, and the gap is confined
  to two chains that share one cause. The stale figure overstated the blast
  radius of a live owner decision — which is the wrong way for a number to be
  wrong on an item that is about to be put to him.
  🎯 **THE OWNER DECISION ABOVE IS STILL LIVE AND UNANSWERED (checked
  2026-09-09).** Options (a), (b) and (c) all stand; nothing here answers them,
  and (c) still changes a standing rule and is his alone. The bracket stays
  `- [ ]`.

  ✅ **Owner ruled 2026-10-03 (asked by `faves-77`, via AskUserQuestion):
  option (b), a session with a browser that can click** reads each store's
  hours widget on the chains' OWN sites (first-party, no rule change). If
  the sites refuse an automated browser, the session reports that and
  stops; options (a) and (c) were not chosen. Ready to take, in a session
  that has an interactive-browser tool.

  🔁 **Superseded the same day: the owner asked for the question again and
  ruled option (c)** (2026-10-03, `faves-77`, via AskUserQuestion), then
  named the source in a follow-up: **Google Maps listings** (each store's
  Google Business Profile hours). This changes the standing first-party
  rule for opening hours on these two chains, so it needs: its own
  provenance value (e.g. `google-maps`) accepted by `validate.py` and
  visible on the record, never laundered into first-party; an ADR recording
  the exception and its bounds (hours only, these chains, Google Maps only);
  and the date read. The ruling above for option (b) no longer stands.
  Ready to take.

  📌 **Claimed 2026-10-03 (`faves-77`): Google Maps hours for both chains, ADR
  0157 reserved; worker in a worktree.**

  🛑 **Google Maps attempt 2026-10-03 (`faves-77` worker): BLOCKED, nothing
  written to the data, no ADR or validator built.** Tool: a headless Playwright
  browser (Chromium; Firefox once), unauthenticated, loading
  `google.com/maps/search/<chain>+<address>` for all 10 branches. Maps answers
  (HTTP 200) but serves its "limited view": the side panel shows ONE status
  line for today only and never the weekly table. `google.com/search` is
  refused outright ("unusual traffic"). So no branch yielded a week:
  - McDonald's Courtenay Place: listing is a different street
    number and "Permanently closed". Address differs; ambiguous, no hours.
  - McDonald's Lambton Quay: "Temporarily closed", no hours.
  - McDonald's Bunny St: "Open 24 hours" (today's line only).
  - McDonald's Johnsonville: "Open 24 hours" (today's line only).
  - McDonald's Porirua: no hours listed at all.
  - Subway Johnsonville: "Open, closes 9 pm", "See more hours" inert.
  - Subway Tawa: "Open, closes 9 pm" (phone-updated 12 weeks ago).
  - Subway Karori: "Open, closes 8 pm".
  - Subway Courtenay Place: listing's street number differs from ours;
    "closes 3 am".
  - Subway Mulgrave St: listing's street number differs from ours;
    "closes 5 pm".
  A single day's closing time is not a week, and "Open 24 hours" cannot be
  told from a 24/7 week. Two address mismatches and two closure flags also
  need a human look. Next attempt needs a browser that gets Maps' full view
  (signed in, or one that can click "See more hours"). Claim stays `[~]`.
