**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 99+1 -->
- [2026-07-10 · 2026-07-10 (Opus: Theme 1b group ordering — send/receive)](2026-07-10-archived-030-2026-07-10-opus-theme-1b-group-ordering-send-r.md) — archived entry, verbatim in its file

- **2026-07-10 (Opus: Theme 1b group ordering — send/receive)**: Built the
  bulk of Theme 1b per ADR 0009. New pure `site/js/share-codec.js`: a
  versioned codec that packs an order into `#share=<base64url(JSON)>` — terse
  keys, UTF-8-safe (macrons survive), every field re-sanitised on decode
  (clip/clamp/phone-charset, ≤200 lines) since the payload is
  attacker-authorable, and fail-soft to `null` on bad base64 / bad JSON /
  unknown version / unknown type / no usable lines. Carries a `shortlist`
  type too (parked feature folds in later). `cart.js` gained a pure
  `mergeItems` + an `order.merge()` store method (sum matching lines, preserve
  `collected`, never mutate inputs). `cart-ui.js`: a "Send to the orderer"
  action on the order sheet → a send dialog (optional name, `navigator.share`
  + Copy-link fallback, reveals a selectable link field if the clipboard is
  blocked); and a receive path that reads the fragment on load (any screen,
  via `initOrderUI`), `history.replaceState`s it away so a refresh can't
  re-prompt, and shows a confirmation ("Add Ruth's 6 items?", grouped) —
  merge only on confirm, graceful "that link didn't work" on a dud.

  **Deliberately deferred: the QR-code fallback.** A zero-dep local QR
  renderer is ~600+ lines (Reed-Solomon + masking) — a clean, separable
  chunk. The all-Apple household is covered by the share sheet (AirDrop), so
  the honest call was to ship the proven core this session and leave QR as the
  next well-scoped piece, rather than blow the session on the encoder before
  the core was verified. ROADMAP Theme 1b marked "mostly done — QR still to
  build".

  Order-sheet chrome stays English (the te reo pass for it is still deferred —
  its strings, e.g. "Add Ruth's 6 items", need interpolation reo.js doesn't
  have yet). Verified: `node --test` **155 pass** (133 + new codec/merge; the
  suite caught a real `Number(null)===0` price bug pre-commit); validate +
  check_no_deps + gen_sbom --check clean; sw VERSION → `.43` with
  share-codec.js added to the precache shell. Browser (real Chrome): home
  boots clean (imports don't break it); a valid share URL renders the correct
  grouped confirmation; a corrupt token renders the fail-soft error. Send's
  click-wiring wasn't headlessly click-driven — it rests on the unit-tested
  codec, proven cross-environment encode↔decode symmetry, and markup mirroring
  the already-verified order sheet. Committed on `main` (not pushed).

  **Next session:** the QR fallback — a small zero-dep byte-mode QR encoder
  (URLs are ASCII; a family order is ~320 chars, well inside a mid-version
  symbol) rendered to canvas/SVG in the send dialog, with a matching unit
  test on the encoder. Then the parked shareable-shortlist links via the
  `shortlist` payload type the codec already carries.
