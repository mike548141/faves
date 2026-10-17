- [ ] **The seven new stubs have no hours, phone or menu** `[M][data]` — they are
  findable by name and pin only. Hours and phone are a web-research pass; the
  menus want an in-store or official-site read (ADR 0036's trusted four).

  📌 *Claimed 2026-10-17-2144 by faves-b4 for hours and phone; released
  2026-10-18 at PR #123's merge.* What is left: the menus (owner-supplied or
  owner-directed, so not a session's to fetch), and Hotel Bristol, whose own
  page contradicts itself on Monday and Tuesday.

**Done 2026-10-18 (hours and phone only; menus untouched, they stay
owner-directed).** Five of the seven already had hours and phone from the
2026-09-07 sweep (`080/190`); this pass re-read the gaps from each venue's own
pages. The pair `detailsVerified`/`detailsVerifiedBy` carries the date and
method; the URLs live here because no per-venue source file exists for details.

| Venue | Hours | Phone | Source | Notes |
|---|---|---|---|---|
| Abrakebabra | written | held; re-confirmed on the contact page | kebabcentral.co.nz home and contact-us | Sun-Tue 10:00-21:30, Thu 10:00-00:30, Fri-Sat 10:00-02:30; Wed `null` (no line published, ADR 0105). Fri/Sat 16h30 span trips validate's transposition warning; it is the venue's own text. "Public holidays may vary". |
| Golding's Free Dive | written | none published | goldingsfreedive.co.nz/details | "Midday to 11 pm, Monday to Sunday". Site gives no street address, so the pair stays `third-party` 2026-08-16 (address still OSM's); `website` set. A third-party listing disagrees; not used. |
| Wellington Sourdough | written | none published (email only) | mosaicvenues.com/venues/ws (wellingtonsourdough.co.nz redirects there) | 7:30am-2:30pm, 7 days; site states the matching address. A one-off Labour Day closure on the page is not modelled. Pair now `official-site` 2026-10-18; `website` set. |
| Hotel Bristol | NOT changed | none for the venue | stargroup.nz/venues/hotel-bristol | Hours panel says Mon-Tue closed, Wed-Thu 12-23, Fri-Sat 12-01, Sun 12-22, yet the same page lists an all-day Monday and an all-day Tuesday deal; our record (Tue-Sun from 12:00, no close) differs on Tuesday too. Contradiction reported, not resolved. Only number on the page is Star Group's head office, not the venue. |
| Dirty Little Secret, Dragonfly, Garage Project Leeds Street | held (2026-09-07, official-site) | held | not re-read | Outside this pass's gap list. |
