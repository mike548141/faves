- [ ] **Today's spot: the announcement, and whether a phone hears it**
      `[L][constraint][design][js]` — owner-raised 2026-11-14: *"This might be
      a feature that drives user notifications eg the food truck has just
      announced it's going to be at location ____ from 11am until 3pm today."*
      ⚑ Two owner rulings inside it, one of them a floor-level confirm.
      <!-- datescan:allow: the owner's verbatim example of the feature — quoted product vocabulary, not a dated claim -->

  **Split the ask in two, because the halves have different bars.**
  *Carrying* the announcement — the truck's spot for today is in its record
  and on its card — fits every constraint and costs nothing new. *Pushing* it
  — a phone that is not open buzzes — has no precedent in this app and needs
  a server that knows which phones to reach. The first can ship under `010`;
  the second is its own ADR, and this item exists to put the choice to the
  owner with the costs stated.

  **Where the announcement comes from — three routes, none free:**
  1. **The owner tells us.** He sees the truck's post, edits the spot, a
     commit deploys (a push to `main` *is* the Cloudflare Pages deploy). Fits
     the content rule exactly. **Cost:** his minutes, every trading morning;
     latency is build time, which for a static site is small but is not
     *instant*. Honest about scale: this does not survive a second truck.
  2. **The truck tells Faves.** A Worker endpoint the venue posts to — a
     form, a message, a tiny token-authenticated `POST`. **Cost:** a new trust
     surface and a venue credential (both **floor-level confirms** before
     anything is built), the Worker now holds *content* rather than opaque
     blobs (ADR 0017's posture was exactly that it never does), and a venue
     can now write to the app — which the no-admin-UI non-goal has kept out
     so far on purpose.
  3. **We read the truck's own channel.** Its social feed, its site. **Cost:**
     this is *"scraping/live sync"* — a named non-goal in `STRATEGY.md` — and
     reading a venue's channel unasked breaks the content rule. Only ever on
     his explicit instruction, per venue, and still a non-goal to reverse.

  **How it reaches a phone — the honest ladder, cheapest first:**
  - **Pull, in the app.** The home screen shows "Out today · Odlins Plaza,
    11–3" on the card and a short *Out today* row above the list; the service
    worker already fetches only the changed file on open (`510/030`). No
    permission, no server, works offline with whatever was last fetched.
    Reaches **only phones that open the app**. This is the floor of the
    feature, and it is most of its value.
  - **A local notification while the app is open.** The cook-mode alarm's
    precedent (36d, `460/040`): `Notification.requestPermission()`, fired
    from the page. Reaches a phone with Faves in a tab in the background.
    Cheap, and the owner has already ruled once on a redundant notification
    (he kept it). Also mostly pointless: people do not leave a menu app open.
  - **Web Push.** The browser's push service wakes `sw.js` with a payload.
    Needs a server that holds every subscribed phone's **push endpoint** and
    sends to it — that is, a Worker that knows a list of devices and, if it
    is to push only *your* trucks, which places each device follows. The
    `430` rulings record that a Worker logging device arrivals was refused
    as tracking under ADR 0017; a push roster is more, not less. Mitigations
    exist and each costs: push *everything* to *every* device and let the
    phone filter (no server knowledge of favourites; every phone wakes for
    every truck; payload size caps), or let the phone subscribe to a
    per-venue topic (the server learns venue follows, not identity — a
    smaller claim, and still a claim). ⚠️ Assumed, not verified here: iOS
    delivers Web Push only to a Home Screen-installed PWA, so "installable"
    stops being a quality bar and becomes a precondition for this one.

  **Who is told.** Only people who have hearted the venue is the obvious
  answer, and it is exactly the datum the server must not hold. The pull
  route answers it for free (the phone knows its own hearts). Any push
  route answers it by *either* holding it *or* pushing to everyone. Say
  which, out loud, in the ADR.

  **Recommendation: build the pull under `010` and stop; file Web Push as
  an ADR question for the owner, not as a build.** The pull delivers the
  announcement to everyone who opens the app, honours offline, the content
  rule and the no-tracking posture, and costs one file per change. Push is
  a real feature and a real server, and it is the kind of step this repo
  takes once by ADR (ADR 0017's own precedent), with the two floor confirms
  taken **before** a key or an endpoint exists. If he wants push, the
  broadcast-and-filter shape is the one that keeps the server ignorant, and
  it should be costed on a real truck's posting frequency first.

  **Verification this item owes when anything ships:** a frozen-clock
  `*_check.mjs` (the `served_check`/`midnight_check` pattern) asserting the
  card line at 10:59, 11:00, 15:00 and 15:01 on the spot's date and its
  absence the day after; `fetch_check.mjs` counting exactly one file fetched
  after a spot edit; and, for any notification, the cook-mode alarm's rule —
  the **blocked-permission path is asserted**, not just the granted one.
