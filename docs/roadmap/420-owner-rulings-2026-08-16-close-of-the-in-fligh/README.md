# Owner rulings — 2026-08-16 (close of the in-flight-residue session)

Four decisions, put to him with the impact of each stated in plain language.

- 🎯 **A named third-party source IS acceptable for opening hours.** This
  changes a standing rule — the corpus has been first-party-only — and it was put
  to him as his alone to change. Ruled: take them. It unblocks McDonald's and
  Subway (10 of 22 branches) and makes ADR 0054's *"nearest, and open"* fully
  alive for the two chains that prompted it.
  **Bounded by these, which are ours to build rather than his to decide:**
  - The source must be **named on the record**, not merely "third-party" as a
    category. `detailsVerifiedBy: third-party` already exists as a value; what it
    does not carry is *which* third party, and an unnamed source cannot be
    re-checked or retired when it goes bad.
  - 🚩 **This ruling makes the deferred per-branch provenance item load-bearing,
    and that is the consequence worth stating out loud.** Today `detailsVerified`
    is **venue-level**, and the honest read is "weakest input wins". So one
    third-party branch would drag a whole chain's derivation down to
    `third-party` — including branches whose address and phone came from the
    company's own site. Pandan already proved the gap with one record; this
    ruling turns it from a curiosity into a blocker on doing the work honestly.
    **Build per-branch `detailsVerified`/`detailsVerifiedBy` first, then capture
    the hours.**
  - A third-party "open" must never read as strongly as a first-party one on
    screen. ADR 0054's three states were designed so nothing is labelled on a
    guess; this adds a fourth kind of knowing and the card should say so.
- 🎯 **The order pill covering a dietary chip: leave it, record it.**
  Recommendation was not offered as a preference and none was needed — he took
  the record-it option. It fires only at the browser's *Very large* text setting.
  It stays an open item under Theme 29 with its measurement (82.5% covered, 0.0 ×
  8.3 px reachable), **ruled deliberately deferred rather than unnoticed** — the
  distinction that matters when someone finds it again.
- 🎯 **`detailsVerified` ageing: split it — opening hours get their own limit,
  phone and address share another.** ⚠️ **This goes further than the analysis
  recommended.** The session's finding was that *no* limit could be chosen yet,
  because every dated record sits inside one 48-hour window and nothing has had
  the chance to go stale; the split was offered as the more honest but heavier of
  three options. He took it. So the shape is settled and the numbers are not —
  and the numbers still cannot come from this corpus. **Build the two-field shape;
  the limits themselves still need either elapsed time or an owner estimate.**
  Note it composes with the ruling above: per-branch provenance and per-kind
  ageing are the same field growing two dimensions at once, and doing them in one
  pass is cheaper than twice.
- 🎯 **The te reo review queue: parked, not scheduled.** Stop adding string
  families to it. [`reo-review-queue.md`](../../reo-review-queue.md) keeps what is
  already drafted, and the safety copy stays English — which was always the safe
  default and costs nothing but time. **The honest consequence:** the te reo
  chrome stays partial indefinitely, and that is now a decision rather than a
  backlog. Do not open new `[reo]` items without asking.

---
