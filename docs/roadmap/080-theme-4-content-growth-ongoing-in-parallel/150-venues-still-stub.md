- [ ] 📸 **Venues still `stub`** `[M][content]` — they render as "menu
      coming soon" cards and never as empty menus, so this is a backlog, not
      a defect. Same `intake/` pipeline.
      🛑 **AMENDED 2026-09-07 — THE 2026-08-17 VERDICT BELOW WAS WRONG, AND
      THE SENTENCE TELLING YOU NOT TO LOOK AGAIN WAS THE HARM.** The
      owner-directed re-sweep (`190`) re-checked the thirteen remaining
      "publishes nothing at all" records by name, by domains that do **not**
      contain the venue's name, and by fetching and reading each page. **Nine
      of the thirteen publish a website and five publish a full priced menu**
      — 5 of 13 fetchable, not none. Five records moved to `menu-complete` the
      same day. The negative verdict was **per-method, never per-venue**: it
      is only ever evidence about the search that produced it.
      📌 **So: this item is still a backlog, and the remaining stubs are
      genuinely thin — but "the research route is exhausted" is not a claim
      any sweep can earn.** Before re-searching, read `190`'s method section;
      it records what was searched as well as what was found, which is what
      makes the next refutation cheap.
      🗄️ **What the item said until 2026-09-07, kept because the wrong claim
      is the evidence:** *"Measured 2026-08-17: 18 stubs remain and NOT ONE is
      fetchable. With the menu fetch closed above, the research route is
      exhausted — the four that publish a website (`babaili-malatang`,
      `caffiend`, `kaffee-eis`, `new-chapter-cafe`) publish no menu on it, and
      the other fourteen publish nothing at all. Only a photo or an in-store
      visit clears any of them, so this item is no longer session work: it is
      an owner errand list. A future session that 'researches the stubs' is
      repeating a search already run exhaustively and written up."*
      🚩 **The four named above have NOT been re-checked** — the owner's
      direction covered the other thirteen and nothing beyond them, so their
      2026-08-17 verdict stands unretested and should be read as exactly that.
      🔑 **Why the count kept lying: "publishes a website" is not "publishes a
      menu".** The stub population splits three ways — publishes nothing ·
      publishes a site but no menu · publishes a menu — and the middle group is
      invisible to a website count. That is what made 18 read as fetchable when
      only 14 were.
      **Derive the count, don't read it here:**
      `python3 -c "import json,glob,collections; print(collections.Counter(json.load(open(f))['status'] for f in glob.glob('site/data/restaurants/*.json')))"`
      — as of 2026-08-15 that returned **16 stub, 22 menu-complete across 38
      records**, of which **13** carry a `verified` date. 🚩 **This item's
      count has now been wrong three times** — "16 … 12" was corrected to
      "17 … 14" on 2026-08-09, re-counted to "16 … 18" earlier on 2026-08-15,
      and the three pubs added later the same day made that wrong again
      within hours. The heading no longer carries a number at all, because
      the heading was the part that kept going stale. A hand-copied tally in
      prose goes stale the moment data lands, which is exactly the trap the
      `pathscan` title fell into. **Do not re-type the numbers next time —
      derive them**, and treat any figure here as of its stated date only.
      The old note that this was "the concrete cost behind Theme 13g" no
      longer applies: 13g shipped, and the caveat now reads the method and
      its age rather than firing on everything undated (ADR 0036).
