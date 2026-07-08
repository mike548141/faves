# Strategy

## Purpose

A single, beautiful place that holds the menus of our favourite
restaurants. It should be the first thing anyone reaches for when the
question is "what are we eating?" — better than digging through Google,
stale PDFs, or photos of paper menus in a group chat.

## Name

Working name **Faves** (short for "My Favourite Restaurants", which is
the intent but too long). Repo `faves`. The name is deliberately cheap
to change until launch; candidates parked: *Our Kai*, *Kai First*.

## The two jobs it must nail

### Job 1 — "We're hungry, what shall we get?"

A group is deciding. Could be dinner at home (takeaway) or going out.
The app must get a group from *hungry* to *decided* in under two
minutes:

- Filter instantly: takeaway vs dine-in, area (northern suburbs vs
  city), cuisine.
- "Pick for us" — a delightful shuffle for deadlocked groups.
- Shortlist a couple of places and hand the phone around.

### Job 2 — "What's on their menu?"

Two very different readers, one menu:

- **Regulars** want speed: their usual, the price, the phone number to
  order. Surface "our picks" and make search/section-jump instant.
- **First-timers (our guests)** want confidence: what kind of food is
  this, what's it like, what's safe for me? Every dish gets a plain
  description; dietary (vegetarian, vegan, gluten-free) and **allergen
  tags (nuts especially)** are first-class, not fine print.

## Audience

Household, friends, and guests — real people on phones, often several
huddled around one screen, often hungry and impatient. Public URL, no
accounts, no logins. The *repo* is private (curation is ours); the
*site* is public so a guest can be sent a link.

## What "amazing" means (success measures)

- Anyone handed the link says "oh, this is nice" — it must feel like a
  polished product, not a hobby page.
- Hungry-to-decided in < 2 minutes for a group of four.
- A first-time guest can pick a dish unaided, including avoiding
  allergens.
- Loads instantly on a phone; works offline after first visit
  (installable PWA).
- Adding a new restaurant is a data task (one JSON file), not a
  development task.

## Launch set (more later)

| Restaurant | Area | Notes |
|---|---|---|
| Takeaway @ Churton | Churton Park, Wellington | |
| Spices Indian | Churton Park, Wellington | |
| KK Malaysian | Ghuznee St, Wellington city | |
| R & S Satay Noodle House | Cuba St, Wellington city | |
| KC Cafe | Courtenay Place, Wellington city | |
| Spring & Fern | Tawa, Wellington | |
| Khandallah Trading Company (KTC) | Khandallah, Wellington | |

## Future direction — a gift to the restaurants (parked, post-v1)

Beyond the household use, this could be given to the restaurants
themselves: a clean, current, phone-friendly page of their own menu
that makes it easier for *all* their customers to browse and to order.
Most of these are small suburban places without a decent mobile menu of
their own — this fills that gap for them.

Implications, noted so later phases lean the right way (no v1 scope
change):

- **Ordering stays "link out", never "build".** "Buy from them" means
  deep-linking each place to *its own* ordering channel (their site, or
  Delivereasy/Uber Eats), not payments in-app. This keeps the existing
  non-goal intact. The per-restaurant shareable URL is already the seed
  of a "here's your page" to hand an owner.
- **Real in-store prices matter more.** A page gifted to a business
  must show *its* prices, not a delivery platform's marked-up ones.
  Where our only source is Delivereasy/Uber Eats (currently KK
  Malaysian, KC Cafe, R & S), prefer owner-supplied menu photos to lock
  in dine-in prices before any such gifting.
- **"Our picks" is household-facing.** Charming for our guests, odd on
  a page handed to the owner. Likely a view that hides picks in a
  business-facing mode — a design call for Phase 2+, not now.
- **Freshness earns its keep.** The "verified on" date and an easy
  update path matter more when a business relies on the page being
  current.

## Non-goals (v1)

- No ordering/payments integration — we link to phone/website. The
  order tally (a device-local notepad that groups what you want and
  totals an estimate) is *not* this: no payment, no account, no
  restaurant integration; it still hands off to phone/website to
  actually order.
- No user accounts, reviews, or comments.
- No admin UI — menus are edited as JSON in the repo.
- No scraping/live sync of menus — curated by hand, dated, and marked
  as "verified on".
