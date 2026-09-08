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

  ✅ **OWNER RULED 2026-09-09 — OPTION 1: ROTATE IT, AND READ IT FROM THE
  ENVIRONMENT.** Not option 2 (delete from the files without rotating) and not
  option 3 (leave it).
  🛑 **The rotation is HIS to do and no session may do it for him.** It is a
  Google credential on his account; the estate's floor says a session records
  the principal's decision about a secret and never originates the act.
  📋 **What a session may do once he confirms the new key exists:** edit
  `intake/ingredients/ingest_food.py` and `ingest_food_v2.py` to read
  `os.environ["GEMINI_API_KEY"]` and fail loudly when it is unset, deleting the
  literal. ⚠️ Both files are **gitignored**, so that edit is invisible to the
  repo and to CI — it leaves no evidence, which is precisely why this ruling is
  recorded here rather than only in a session log.
  🚩 **Order matters and only one order is safe:** revoke first, then edit. An
  edit that removes the literal while the key stays valid leaves a live
  credential that has already been written to disk in cleartext, which is
  option 2 — the option he declined.
  ⏳ **Owed by him, and nothing else in this item can proceed without it.**

