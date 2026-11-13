## 2026-08-17-1815 — addendum 4: the last two rulings, and the session closes

**1. The filter label is "Dining" — the owner's word** (`74ff51a`), after
"Service" was put to him as too vague and "Order type" was offered and declined.
Label **"Dining"**, all-value **"All dining"**. `app.js`'s aria-label word moved
with it: that string lands in *"Takeaway dining filter is on, clear it"*, so the
screen reader and the screen have to name the same control.

🚩 **Two concerns were raised with him; his wording stands, and both are recorded
at the point of use so nobody re-opens them by reflex.**
- The `style` select beside this one is literally *"a style of **dining**
  filter"* (37k — quick eats through fine dining). Two adjacent controls now
  touch the same word.
- 🛑 **The te reo could not follow, and it was checked rather than assumed.**
  There is **no attested abstract noun for "dining"** in te reo — every
  dictionary result is a **place** (`wharekai` dining hall, `taiwhanga kai`
  dining area, `rūma kai` dining room, `paparahua` dining table), and a *place*
  word on a control that picks takeaway from dine-in is **the exact fault 37j
  paid to remove** when it dropped *"Ngā wāhi katoa"*. The obvious head noun
  `kai` means *food* and collides with the cuisine select two controls away. The
  usual move — compose in a pattern the file already uses, over a noun it already
  carries — is unavailable, because there is no such noun for this sense.
  🔑 **So the gloss is left saying `Ratonga` (service) and is recorded as
  KNOWINGLY WRONG.** A wrong gloss visibly marked wrong beats a right-looking one
  that was invented; the record is what stops the next session tidying it into an
  invention. Queued at `340/140` with three ways out, the English-fallback option
  priced as a real reo regression rather than offered as free.

**2. The CI job rename — DONE, both halves, owner-authorised** (`436041d`).
`zero dependencies` → `repo invariants`. 🔑 **The trap is repeatable and the
recipe is now in `ci.yml` and on `340/130`:** `protect-main` matches required
contexts **by job name**, so renaming the workflow alone silently un-requires the
job. Migrated with **no gap** — (1) add the new context while the old one still
stands (verified: seven contexts held at once), (2) rename and push, (3) drop the
old one once a run reported under the new name (verified: `repo invariants`
`success` first). Final state read back from the API: **six required contexts,
`enforcement: active`, `bypass_actors` UNCHANGED**. ⚠️ This makes an **audit**
truthful. It does **not** make the gate bite — `030`(b) is his separate deferred
decision and nothing here touched it.

### What a future session should know, in one place

- **Records here overstate owner rulings.** Three found in one day, all in the
  same direction (`010/010`, `340/110`, the CHANGELOG). **Quote him verbatim
  beside any paraphrase.**
- **Board doctrine is atelier's.** Search the repo a rule comes FROM before
  proposing a change to it. The checkbox is a **work-owed tri-state** and a
  parked item is `[x]` — the disposition goes in the item's text.
- **`cook_check` wedges on its default recipe** (`340/120`); use
  `--dish "Easy Pad Thai"`.
- **URL keys may still be broken freely** (`010/020`) — but that permission has a
  condition this repo cannot detect, so cite the item whenever you use it.
- **`autoMode`, not `permissions`, is what refuses destructive git here.** The
  machine-side rules are gitignored; `CLAUDE.md` carries the only record.

**Close state:** `main` @ `1b519a1`, tree clean, no worktrees, no branches, no
claims outstanding. Board **64 open · 19 done · 4 waiting**. `SHELL_VERSION`
`2026-08-17.128`. Every Python gate, 1116 unit tests and twelve of thirteen
browser checks green; the thirteenth is `340/120`.

