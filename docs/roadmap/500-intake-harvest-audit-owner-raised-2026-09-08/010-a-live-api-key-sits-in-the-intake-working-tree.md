- [ ] 🔥 **A live Google Gemini API key sits in plaintext in the intake working
      tree, and it was reported once and never rotated** `[XS][security]` —
      re-found 2026-09-08 by the intake audit (session faves-o1), and raised
      again because finding it twice is the point.

  **The facts, each verified rather than repeated.**
  - The key is in `intake/ingredients/ingest_food.py:10` and
    `ingest_food_v2.py:12` — the owner's own prior tooling, not this repo's.
  - ✅ **It has never been committed**: `git log --all -S'<prefix>'` returns
    nothing, and `git check-ignore -v` confirms `.gitignore:19` (`intake/**`)
    covers both files. So there is **no public exposure today**.
  - 🛑 **It was live when last tested.** `docs/SESSIONS.md:9196` records the
    owner asking whether it still worked — *"I am betting it is not in which
    case you are wasting my time with noise"* — and the session testing it:
    HTTP 200, full model list returned. It was reported in one line and
    dropped.

  🔑 **Why it is filed rather than left as a session note.** The exposure is one
  `git add -f` away, and the thing standing between the key and a public repo
  is a single ignore rule that nobody re-checks. A credential whose safety rests
  on an ignore line is a credential waiting for the day somebody stages a
  directory. It is also **not this repo's key to rotate** — it is the owner's
  Google credential, and the estate's rule is that a session records the
  principal's decision about a secret and never originates it.

  🎯 **The owner's call, offered with what each costs.**
  1. **Rotate it and put the new one in the environment**, not the file — the
     scripts read it from `os.environ`. Removes the class. Costs one console
     visit and one edit to two files he owns.
  2. **Delete the key from both files**, leaving the scripts to read an
     environment variable, without rotating. Cheaper, and it leaves a key that
     was written to disk in cleartext still valid.
  3. **Leave it.** The ignore rule has held since 2026-08-15. Free, and it is
     the option that has already been chosen once by default.
  📌 Nothing here is done without his answer.
