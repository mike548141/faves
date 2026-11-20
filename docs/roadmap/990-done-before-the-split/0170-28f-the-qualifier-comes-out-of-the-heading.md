- [x] **28f — the qualifier comes out of the heading** `[M][design]` — ✅
  **done 2026-08-16** (`82ddb4b`, `b391f1b`), ADR 0057. Owner, from his phone:
  *"don't put the time into the section heading because it makes the section
  heading too big in the top section heading list."* The heading string was
  doing two jobs that want opposite lengths — it is also the jump-nav chip, and
  Sprig & Fern's `Gold Card (Mon–Fri 11:30–17:30, weekends 10:00–17:30)` was a
  **53-character chip, wider than a 390 px screen**. Sections now carry `note`,
  rendered as a `<p>` under the `<h2>`; the chip and anchor use the name alone.
  Eleven sections across seven venues moved.
  - **Owner ruled on the follow-up:** move the qualifiers, leave the glosses.
    R&S Satay's `(Noodle Soup)`, `(Fried Noodles)`, `(Beef or Chicken)` stay —
    they translate the dish rather than qualify the section, and as subtext
    they would read as a serving rule. Takeaway at Churton's `Burgers
    (Standard)` also stays: "Standard" is what tells it apart from `Gourmet
    Burgers` three rows below, so as subtext it would say nothing.
  - **Not `available.note`** — `check_available` refuses a note-only window,
    and `available` is a *filter* object (`isAvailable`/`isRetired` act on it),
    so a presentational string there would make a section's visibility look
    conditional. The two now mean different things and both render.
  - **Leaves 28c free.** `note` is prose and nothing parses it, which is the
    honest state of the data: a weekday+interval rule is still inexpressible.
    When 28c lands it adds a structured field beside this one, no migration.
