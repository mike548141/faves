- [ ] **17b — Step timings and a tap-to-start timer** `[M][design]` — the
  owner's item 2. Per-step time where it is useful, and beside any step with a
  duration, a **Start timer** that counts down and sounds an alarm.
  - **Where the duration comes from:** authored per step (`{ text, minutes }`)
    beats parsing the prose, but parsing is what makes it work on the 24 recipes
    that already exist. Recommend **parse to suggest, author to confirm** — the
    parser proposes, the data records it, and the UI only ever shows an
    authored value.
  - 🚩 **The alarm is the hard part, and it is a platform limit, not a design
    choice.** A timer started by a tap can play sound reliably **while the page
    is in the foreground** (the tap unlocks audio). Once the phone locks or the
    app is backgrounded, iOS gives no dependable way for a web app to make a
    noise — Web Push needs a home-screen install, permission, and a network the
    kitchen may not have. So: pair the timer with **17d's wake lock** so the
    screen stays on and the alarm actually fires, and be honest in the UI rather
    than promising a background alarm we cannot deliver.
  - **A real kitchen runs three timers at once.** Design for multiple concurrent
    labelled timers ("rest the dough", "simmer") from the start; a single global
    timer will be rebuilt within a week of use.
