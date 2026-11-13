## 2026-08-09 — Five owner roadmap items: feedback, add-ons, wording — Opus 5

Roadmap-only session; no code, no data, no version bumps. Five owner asks
recorded, each checked against the code or data before it was written down
rather than transcribed on trust.

**One was already a theme, parked on a gate that has lapsed.** The feedback ask
is Theme 4c ("request a place, report an update"), parked 2026-07-08 with
"no email — deploy first". The deploy happened 2026-07-12, so the item was
reactivated in place rather than duplicated as a new theme. Widened to the two
streams the owner named — data corrections vs app feedback — and given the
transport comparison: compose-and-share (zero infra, works offline, and for a
family audience the message *is* the channel) recommended over the GitHub-issue
and Pages-function options, both of which cost something the audience doesn't
have. Recorded the safety rule with it: an allergen correction is a suggestion
to the owner, never a live edit.

**Two asks were one feature — now Theme 14.** Dish customisation and menu
add-ons end in the same order line, so they were written as one theme rather
than two. The owner's example checks out verbatim: `sprig-and-fern-tawa.json`
carries `"Add gravy $3."`, `"Add chicken, halloumi, prawns or beef +$7."` and a
brunch-sides section that is an add-on group for eight dishes. So the data is
captured and only the shape is wrong — which makes the content sweep, not the
schema, the bulk of the work.

🔎 **Two things the theme would have got wrong if written from the ask alone.**
(1) **An add-on carries its own allergen tags** — halloumi on a dairy-free dish
makes it not dairy-free, so `dietary.js`'s predicates have to evaluate dish +
selected add-ons or a dish that was safe when you tapped it stops being safe
when you configure it. Written in as shipping *with* the schema, not after it.
(2) **"No tomato" has nothing structured to remove from** — restaurant dishes
have no ingredient lists (only Cook-at-Home recipes do), so the honest v1 is a
free-text note per order line, not a curated component list across 31 venues.

**Theme 15 holds the two UI asks.** The Settings navigation rethink is recorded
with a flag rather than a plan: "accordion sections in one sheet" is ADR 0025's
**first rejected alternative**, on measured grounds (several open sections
rebuild the same 1578 px wall; expanding one shifts everything below it). The
suggestion put on record — expand in place, one row open at a time, keeping the
current-value subtitles — answers that objection while dropping the drill-in.
Flagged that the drill-in landed 2026-08-08 and its 390 px phone look is still
owed, so it should be judged on a thumb before a replacement is commissioned.

The wording sweep found a trap worth naming: the two Distance dials the owner
compared genuinely mean different things — one filters venues by reachability,
the other controls how many branches of a *single* multi-branch venue show
(the repurposed `favBoostKm`). Renaming both to "places" would make them read as
two settings for one job, so the deliverable is a term decision first, then the
sweep. Scope includes `site/js/reo.js`, since the English and te reo strings are
one table and a rename skipping it desyncs the translation silently.

`validate.py` green. Nothing owed but the owner's calls: the transport choice
for feedback (⚑), and whether to reopen ADR 0025.

