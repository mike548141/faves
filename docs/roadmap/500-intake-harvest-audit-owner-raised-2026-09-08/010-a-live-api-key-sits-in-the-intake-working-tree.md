- [x] ✅ **A live Google Gemini API key sat in plaintext in the intake working
      tree — DELETED 2026-09-09, see the foot of this item** `[XS][security]` —
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


  ---

  🎯 **OWNER RE-DIRECTED 2026-09-09 (session faves-3b): _"I want you to do it —
  you have access using the shed repo."_** This **supersedes** the
  2026-09-09 line above saying the rotation is his alone and no session may do
  it for him. He is the principal and may lift his own restriction; recorded
  here rather than argued.

  🛑 **NOT DONE — blocked on an interactive re-auth, measured not assumed.**
  `gcloud` is installed and shows the owner's own account as active,
  but any live call returns *"Reauthentication failed. cannot prompt
  during non-interactive execution — please run `gcloud auth login`"*. An
  agent session cannot complete that flow. **One `gcloud auth login` in his
  own terminal unblocks the whole item.**

  🔎 **What the estate root already knows about this key, read at his
  direction and reported as metadata only.** The credential registry
  identifies it by `uid` alone and has never held its value: it is the
  *Default Gemini API Key*, created automatically 2026-01-09 with its
  project, **restricted** to `generativelanguage.googleapis.com` and nothing
  else, with **no keychain item** and the standing assessment *"no estate
  consumer uses it"*. Its recorded roll story is a console action. Two further
  facts bear on the risk: the org's **billing account is closed and no project
  has billing enabled**, so the key cannot run up a bill — but it can still
  call the free tier, which is the abuse that matters; and the estate's own
  minting tool is **deliberately incapable** of creating a key of this kind
  (*"no `--create-key` flag and never will"*), because the estate pattern is
  keyless impersonation.

  🎯 **A challenge to the ruling, raised rather than acted on.** The order was
  *rotate*. But **delete** now looks the better answer, and it was not among
  the options he was given:
  - The registry says nothing in the estate uses it, and the only consumer we
    have ever identified is two **one-off intake scripts whose job is done** —
    the 183 photographs are harvested and ADR 0090 has landed.
  - A regenerated key is the same class of object: a bearer credential with no
    identity, sitting in cleartext in a gitignored file, one `git add -f` from
    a public repo. Rotating replaces a live key with a live key.
  - The estate's own doctrine (shed ADR 0001) is that exported keys should not
    exist at all.
  **If the scripts are ever needed again**, mint access then, or move them to
  the keyless pattern. 📌 His call; nothing is done either way until he
  answers, and the revoke-before-edit ordering still binds if he keeps
  *rotate*.

  ---

  ✅ **DONE 2026-09-09 (session faves-3b) — THE KEY IS DELETED, NOT ROTATED.**
  The owner re-authenticated `gcloud` himself, then ruled **delete with no
  replacement** — accepting the challenge above and setting aside his own
  earlier *rotate* ruling. Recorded as a changed mind, not as a reinterpretation
  of the first one.

  🔎 **Verified BEFORE the irreversible act, and the checks are the point.**
  - Both scripts carried the **same** literal, and that literal **was** the live
    *Default Gemini API Key* — compared by hashing the file value against the
    console's `get-key-string` and printing only the boolean, so no secret
    entered the transcript.
  - `uid 1ff0b2c5-…047d3` matched the estate registry's record exactly.
  - It was the **only API key in the whole organisation** — all five projects
    enumerated, four already held none.
  - 🛑 Stated plainly to him before he chose: **Google cannot regenerate a key
    in place.** Rotate and delete BOTH destroy it; the only difference is
    whether a replacement exists after. So "anything unknown that uses it
    breaks" was true of both options, and was put to him as a third choice
    (*stop — something else uses it*) which he declined.

  ✅ **After:** `gcloud services api-keys list` returns **zero keys in every
  project in the org**. Both scripts now read `os.environ["GEMINI_API_KEY"]`
  and raise `SystemExit` with instructions when it is unset — the guard was
  tested both ways in isolation (raises when unset; reads the value when set),
  because `google.genai` is not installed on this machine and the import fails
  before the guard is reached. **Zero `AIza` literals remain anywhere under
  `intake/`.**
  🔑 **The revoke-before-edit order proved itself immediately:** the literal
  appeared in a `grep` output while locating it, and was already dead when it
  did. Under the order the owner declined — edit first, revoke later — that
  same grep would have leaked a live credential.
  ⚠️ **Both files are gitignored, so this edit leaves no trace in the repo or
  in CI.** This note is the only durable record that it happened, which is why
  it is here rather than only in a session log.

  🔎 **The BRACKET was still `- [ ]` and the item still opened with 🔥 until
  2026-09-09 (session faves-c1), four sections after its own ✅ DONE.** So the
  generated `docs/ROADMAP.md` — the file anyone skims to find the work — carried
  *"a live Google Gemini API key sits in plaintext"* as the board's single
  highest-severity **open** item, about a key that no longer exists. Found by
  reading the item before reporting it, which is the only reason it was caught.
  🔑 **A closing session updates the BODY and forgets the one character the
  index is generated from.** Everything downstream of it — the board, any count,
  any sweep that ranks by severity — reads the bracket and never the prose. The
  body was impeccable; the state line was a lie, and the state line is the half
  that travels.
