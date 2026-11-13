## 2026-08-16 11:38 UTC — addendum: the owner authorised the backend, and the test for the crypto was decorative

Continues the entry above. Three rulings came back on what that entry raised, and
one of them **amends a ruling he made the same morning**.

- 🎯 **The Worker is authorised.** ADR 0017's ⚑ standing-backend gate is
  discharged. Briefed on the new public endpoint, the ciphertext-only guarantee
  and the ~$0 cost before he answered.
- 🎯 **`sync-merge.js` stays precached** — the 5.9 KB option to pull it out was
  offered and declined. Do not re-propose it.
- 🎯 **The Reset confirmation drops the device count.** His morning ruling asked
  it to *"name the number of devices it will reach"*. Building the merge proved
  that unobtainable: an E2E blob with one shared bearer code means the server
  holds one opaque ciphertext, a roster can only live inside the blob, and a
  device that syncs once and is never opened again never leaves it — so any
  number is an upper bound. Put to him with three wordings; he chose **name the
  scope, not a number**. *"Everywhere, always"* is untouched. 🔎 **The consequence
  worth having: the roster is now unnecessary**, which removes the one piece of
  per-device state the blob would have carried and the age-out guess it needed.

### Built: the crypto, the code, the Worker (three agents, disjoint files)

`sync-crypto.js` (mine), `sync-code.js` and `worker/` (one agent each, file
ownership named both ways). ADR 0061 records the decisions; 875 tests green.

### 🔎 The finding: my own test for the security property asserted nothing

The whole promise is that the code is split — HKDF under **different** labels
gives a blob id the server may hold and a key it must never see. Derive both
under one label and the server holds the decryption key, while the app works
perfectly.

I sabotaged the module to check the suite caught it. **All 13 tests passed.** The
test named for the separation derived a key *from the blob id*, which differs
from the real key whether or not the labels match — so it never touched the
property it was named for. Rewritten to derive both HKDF streams by hand and
compare them; re-run against the same sabotage, it fails.

🚩 **This is the decorative-guard shape again, and note where it landed: inside
the one file where I was being most careful.** Care is not what catches this.
What caught it was the cheap mechanical habit of breaking the thing on purpose,
which cost about a minute. The labels are now `export`ed for no reason other than
that the property can be observed — *a property nothing can observe is a property
nothing is guarding.*

A second instance of the same class, caught by a different mechanism: the Worker
agent assumed a 64-char blob id against the client's real 32-char contract. It
found that by **reading the client module** rather than by any test, and both
suites would have stayed green while every request 400s. There is now one
assertion that crosses that boundary — the client derives an id and runs it
through the Worker's own validator.

### 🚩 Left undone, deliberately

**The Worker is not deployed.** No `wrangler` and no Cloudflare credential on this
machine; installing a tool and creating a live endpoint on his account are his
calls, and the authorisation to *build* it is not authorisation to install
tooling unasked. `worker/README.md` has the exact steps and a least-privilege
token scope that deliberately does not reuse the existing Pages/DNS token.

**Sync still does not work end to end.** What remains: the deploy, the
push/pull/debounce client, the pairing UI, and the **base-snapshot store** — the
last of which is the only remaining piece of the offline half, and without it the
merge silently degrades to the additive behaviour ADR 0060 exists to replace.

