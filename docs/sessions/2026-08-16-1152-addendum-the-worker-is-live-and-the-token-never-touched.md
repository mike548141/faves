## 2026-08-16 11:52 UTC — addendum: the Worker is live, and the token never touched this repo

Owner ruled the deploy path: **install wrangler, mint a scoped token** — then,
unprompted and correctly, *"that token should be stored in shed and I'm
expecting it is not held in the Faves app at all where someone could take it."*

**Done exactly that, through the estate root's own tooling rather than by hand.**
A dedicated Cloudflare child token minted with the estate's mint tool, value
written **only** to the macOS login keychain, story recorded in the estate
credential registry, and the deploy coordinates (account id, both KV namespace
ids) recorded in the estate inventory. **Nothing of it is in this repo** —
`worker/wrangler.toml` still carries its `REPLACE_WITH_…` placeholders, and a
redeploy regenerates a filled config outside the tree.

**Scope, because least privilege is the point:** two account permission groups,
`Workers Scripts Write` and `Workers KV Storage Write`. **No zone scope at all**,
so the credential cannot reach the estate's DNS. Deliberately **not** the Pages
credential this site deploys on — reusing it would have put two unrelated blast
radii on one token. Write scope is only acceptable because of ADR 0061: whoever
holds this can replace the Worker or delete ciphertext, and cannot read one
user's data.

⚠️ **A claim I made here and then retracted, in the same session.** I recorded
our `.gitignore` line `tools/.cf-token` as a *trap* inviting a Cloudflare token <!-- pathscan:allow: a .gitignore entry — the whole point is that this path must never exist in the tree -->
into this public tree. **Wrong, and retracted.** Re-reading it, the comment
directly above reads *"the Cloudflare token lives in the environment, never in
the repo"*, and the entries (`.env`, `*.token`, `tools/.cf-token`) are a <!-- pathscan:allow: a .gitignore entry — the whole point is that this path must never exist in the tree -->
defensive net for exactly that. **Deleting them would make an accidental commit
more likely, not less.** Left alone deliberately.
🔎 Worth keeping rather than quietly fixing, because of *how* it nearly went
wrong: I read the ignore list without reading the four words of comment above
it, and wrote a confident finding into two repos' permanent records. A session
acting on it would have removed a working safeguard in the name of security.
**A finding about a file is not final until you have read what the file says
about itself.**

### Verified live, not inferred

Ten checks against the running Worker with real derived keys and real
ciphertext — 404 before write · 204 PUT · 200 GET with ETag · round trip
decrypts identical · no plaintext on the wire · stale `If-Match` 412 · correct
`If-Match` 204 · another code's blob id 404 · malformed id 400 · 300 KiB body
413. All passed. Residue: one test blob under a throwaway code, ciphertext of a
fixture, expiring with the 180-day TTL.

### 🚩 What this does NOT mean

**Sync does not work for a user.** Nothing under `site/` calls the endpoint. The
remaining work is the push/pull/debounce client, the pairing screen, and the
**base-snapshot store** — and that last one is load-bearing, not cosmetic:
without it `mergePersonal` has no `base`, and it degrades silently to exactly
the additive behaviour ADR 0060 exists to replace. A future session must not
read "Worker deployed" as "sync shipped".

### Local tooling note

`wrangler` installed **globally** (`npm install -g`), deliberately not as a repo
devDependency — a `package.json` entry would put a dependency in a repo whose
whole first constraint is not having any, even a dev-only one. The zero-build
rule governs the shipped site, but the cheapest way to keep that true is to keep
the tree clean. Also: the estate's Python tooling needed `SSL_CERT_FILE=/etc/ssl/cert.pem`
on this machine — Python 3.14 here ships no CA bundle, so `urllib` fails
certificate verification while `curl` succeeds against the same endpoint.

