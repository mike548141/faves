- [~] **v2 — continual sync (Cloudflare Worker + KV)** `[M][constraint]` ⚑ —
  **part-done, claim released 2026-08-16.** The **merge engine is built, tested
  and shipped** (`site/js/sync-merge.js`, 26 tests, **ADR 0060**) — owner-directed
  this session ("so my iphone and laptop show the same favourites, ratings etc").
  🔎 **The finding was bigger than the item: both halves of the merge bullet
  below are wrong against the code.** "Union hearts" makes un-hearting impossible
  — `favourites.merge()` never removes, by design and by docstring — and
  "last-write-wins per scalar" is unimplementable because **nothing in the
  personal layer carries a timestamp**, verified across all five modules. ADR
  0060 supersedes that bullet with a three-way merge against the last-agreed
  snapshot, which buys deletion propagation at **no schema change**. Two shipped
  bugs fell out of the same read and are fixed: a transfer link that destroyed
  the "follow me" localisation preference, and a merge import that silently
  dropped `units` and `currency`.
  ✅ **Also built 2026-08-16, claim released:** the **E2E crypto and the bearer
  sync-code** (`sync-crypto.js`, `sync-code.js`, **ADR 0061** — the code is split
  by HKDF into a blob id the server may hold and a key it must never see), and
  the **Worker source, config and README** (`worker/`, 19 tests against a fake
  KV). The owner authorised the backend (ADR 0060 addendum).
  ✅ **DEPLOYED 2026-08-16** at `https://faves-sync.cakeit.workers.dev`, on the
  owner's go, and **verified live** — ten checks against the running Worker, not
  inferred from the unit tests: 404 before write, 204 PUT, 200 GET with ETag,
  ciphertext decrypting identical, no plaintext on the wire, stale `If-Match`
  412, correct `If-Match` 204, another code's id 404, malformed id 400, and a
  300 KiB body refused 413. Deployed with a purpose-minted Cloudflare child
  token scoped to two account groups and **no zone scope at all**, held only in
  the macOS keychain; `worker/wrangler.toml` keeps its placeholders on purpose,
  because this repo is public and the real ids live in the estate root.
  ✅ **SYNC IS LIVE — 2026-08-16.** The engine (`sync.js`), the ignition
  (`sync-start.js`, imported by all three screens) and the pairing screen
  (`sync-ui.js`, Settings → *Sync across your devices*) all shipped. **Verified
  two-device against the deployed Worker**, not against a stub: two devices with
  different hearts converge, a rating crosses, and **un-hearting on one device
  removes it on the other** rather than being resurrected — the failure the
  original ADR 0017 design could never have avoided.
  🔎 **The finding that made it worth wiring rather than declaring done:** every
  part — the code, the crypto, the merge, the deployed Worker — was built,
  tested and green while **nothing imported any of it**. The parts were correct
  in isolation and the feature did not exist. See ADR 0060 addendum 2 for the
  sharper one: the allergen question was asked and the answer discarded.
  ~~**Was open:** the push/pull/debounce client; the
  pairing UI; and the base-snapshot store the merge needs~~ — that last is
  the only remaining piece of the *offline* half, and without it the merge
  silently degrades to the additive behaviour ADR 0060 exists to replace.
  🚩 **The endpoint being live is not the feature being live**: nothing under
  `site/` calls it yet, so sync does not work for a user today.
  🚩 **Two gates before any of it
  ships:** the Reset-propagation wording (owner's ruling, Theme 32 — and ADR
  0060's last consequence shows that ruling cannot be met as stated, because an
  E2E blob cannot count devices); and the About-screen "no accounts" line, in
  lockstep with a passkey path.
  a tiny Worker holds **one E2E-encrypted blob per user** in Workers KV.
  Design (all in ADR 0017):
  - **Continual bidirectional**, not a one-off migrate: each device keeps
    its offline-first local copy, pushes a **debounced** write (batch a
    flurry of changes into one write on a **5–30 s** idle/blur window —
    never per-tap; writes are the one scarce KV resource), pulls + **merges
    client-side** on open/foreground. KV blob = shared mirror, not source
    of record.
  - **Claim is pluggable over the one E2E store** (addendum, ADR 0017):
    **passkey + WebAuthn PRF** is the headline path — the passkey is the
    claim *and* PRF derives the E2E key on-device (server never sees it),
    platform-synced via **iCloud Keychain** / Google Password Manager, so it
    rides the user's existing Apple/Google with **no OAuth app, no Apple
    Developer fee, no email/PII**. Verified Q1 2026: Safari 18+/Chrome/Android
    ✅, Firefox ✗. The **bearer sync-code** (machine-generated ~44-bit word-code,
    QR *or* words) stays the **universal fallback** for Firefox / non-passkey /
    "just give me a code". OIDC "Sign in with Google/Apple" rejected — it
    claims but supplies no E2E key. No traditional accounts either way.
  - **E2E-encrypted** (`crypto.subtle`, key from the code): server stores
    only ciphertext, so merge (union hearts, last-write-wins settings,
    read-merge-write on push) is all client-side.
  - **Cost ≈ $0** on Cloudflare's free tier (blobs are KB; the debounce
    keeps writes far under the 1k/day cap); **$5/mo** soft floor only if it
    ever outgrows free. Opt-in, disposable (lose the code → mint a new one,
    re-seed), degrades to local-only offline.
  - Honest limit: **on-device at-rest encryption is the platform's job**
    (OS full-disk encryption) — a web app can't meaningfully encrypt its
    own `localStorage` against someone holding the unlocked device without
    prompting for the code every open. We won't overclaim it.
  - ⚑ v2 is the first standing backend — building it is the owner's go.
