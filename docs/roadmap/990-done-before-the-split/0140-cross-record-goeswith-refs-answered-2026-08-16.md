- [x] 🔎 **Cross-record `goesWith` refs — ANSWERED 2026-08-16, deliberately not
  built.** Disposition: closed as *asked and answered*, not as *done*. The open
  reopen-when condition lives on in `ROADMAP.md` under Theme 25; only the
  analysis is archived here.
  Original text: *"the other record is not loaded, so `validate.py`'s `ALL_NAMES`
  pre-pass matches names and not ids. Widening it is a separate, larger change."*
  Two findings, and the second says the item was aimed at the wrong thing:
  1. There are **zero** cross-record `goesWith` refs in the corpus (7 same-record
     ones, all resolving). The gate has nothing to catch.
  2. **Widening `ALL_NAMES` would not achieve what the item wants.** The wire
     format is `id#Display Name`, and `pairingLinks` renders the post-`#` text as
     the chip's **visible label**. Writing `id#cheeseburger-gold-card` would
     validate, and would even anchor correctly — and the chip would read
     "cheeseburger-gold-card" to a human. So the real question is the **wire
     format** (a ref carrying an id *and* a label), not the validator.
  Reopen when a cross-record ref actually needs to point at one of the 3 venues
  that carry duplicate dish names.
