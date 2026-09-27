- [ ] 🔎 **Nine Simmer photographs dropped into `intake/` on 2026-09-09 were
  never read or recorded** `[S][content]` — found 2026-09-28 (session
  `faves-8e`) while checking that moving the stripped copies out of scratch
  had not disturbed `intake/`.

  `check_provenance.py` exits 1 on this machine: *"intake/menus/Simmer Cafe
  no longer matches the record — 4 file(s) recorded, 13 on disk"*. The four
  it knows are `IMG_7255`–`7258` (2026-09-07). `IMG_9867`–`9875` are nine
  more, file-dated 2026-09-09 22:31 local. They are owner-supplied, so reading
  them is in scope; nothing says what they show. They could be a newer menu,
  a drinks list, or re-shoots.

  🛑 **CI cannot see this.** `intake/` is gitignored, so on the runner the
  gate reads only the committed record and passes. The drift is visible
  only in the primary checkout, and only to someone who types the gate.

  **The work:** read the nine photos. Transcribe anything new, following
  the refresh rules (append, never overwrite: ADR 0047/0023). Then run
  `python3 tools/intake_exif.py --rebuild` so the record matches the disk,
  and confirm `check_provenance.py` exits 0.
