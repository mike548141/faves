**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 136+1 -->
- [2026-07-23 · ~0525 UTC](2026-07-23-0525-addendum-sync-claim-mechanism-passkey-prf.md) — 2026-07-23 (addendum: sync claim mechanism — passkey+PRF)

- **2026-07-23 (addendum: sync claim mechanism — passkey+PRF)**: Owner asked
  whether an existing Google/Apple account would remove the need for the
  word-code/QR. Refined the ADR 0017 decision (addendum, not a rewrite): claim
  is **pluggable over the one E2E store**. The sync-code did two jobs (claim +
  E2E key); OIDC "Sign in with" does only claim and supplies no encryption
  secret → rejected under the no-decrypt requirement. **Passkey + WebAuthn PRF**
  preferred: identity + a PRF-derived on-device E2E key the server never sees,
  platform-synced via iCloud Keychain / Google Password Manager — rides the
  user's Apple/Google with no OAuth app, no Apple Developer fee, no email/PII.
  Verified Q1 2026: Safari 18+/Chrome/Android ✅, Firefox ✗ → **bearer sync-code
  stays the universal fallback**. Build shape: E2E blob store claim-agnostic
  first, passkey+PRF headline, code fallback. Updated ADR 0017 (addendum),
  decisions README, ROADMAP Theme 9. Docs-only.

