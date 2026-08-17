# Theme 4 — Content growth (ongoing, in parallel)

- **More favourite restaurants.** The master list lives *outside* the
  repo — a paper list with the menus/recipe books, an Apple Note, or a
  photo in the library. Those aren't reachable from here; the fast path
  is the existing `intake/` pipeline: drop photos/screenshots/Notes
  exports into `intake/`, and they get transcribed to schema (prices from
  paper/in-store, **never** delivery apps).
- **More dishes & home recipes** — same pipeline; the placeholder recipes
  in `cook-at-home.json` get replaced from the Notes export.
- **Dish photos** `[L][schema]` — ✅ rendering shipped 2026-07-08 (self-hosted
  `image`/`alt`, SW-cached, no layout shift); now purely a sourcing task (drop
  owner photos into `intake/`). Render detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

### Per-venue content follow-ups

Small, known gaps left behind by a transcription session — each one needs a
fact nobody had at the time, not a decision. **The rule these all obey: a
missing price stays `null`; nothing is inferred from a neighbouring card or a
delivery app.** Clear one by bringing back the fact.

> 🎯 **Dish-level gaps are no longer listed here — they live on the dish**
> ([ADR 0041](../../decisions/0041-a-dish-carries-its-own-open-questions.md)). A dish
> carries `needs`, the app shows a **`?` pill** saying what would clear it, and
> the worklist is derived:
>
> ```sh
> python3 tools/needs.py            # everything outstanding, with the why
> python3 tools/needs.py --count    # one line per venue
> python3 tools/needs.py --what price
> ```
>
> This section keeps only what has **no dish to hang on** — a section that was
> never itemised, or a fact about the whole venue. Naming dishes in prose here
> is what went stale; don't start again.

> ✅ **Shipped 2026-08-17 — the menu fetch is DONE, all 18 authorised venues
> resolved.** 14 transcribed (4 Sprig + Fern taverns · The Catch Sushi Bar ·
> Satay Kingdom · Charley Noble · Regal Chinese · Rock Yard Vietnamese · Pizza
> Pomodoro · Gong Cha · Pizza Hut · Subway · The Victoria Tavern) and 4 proven
> to publish no menu anywhere (`babaili-malatang`, `caffiend`, `kaffee-eis`,
> `new-chapter-cafe`) — a decision reached by exhaustive check, not an
> oversight. Corpus: **37 venues with menus, 3,059 dishes**.
> 🔑 **The fetch authorisation is now exhausted**, so every one of the 18
> remaining stubs is blocked on a photo or an in-store visit. Do not re-attempt
> them as research — see "Venues still `stub`" below.
> Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
