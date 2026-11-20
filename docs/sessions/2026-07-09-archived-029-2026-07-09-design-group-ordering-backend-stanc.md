- **2026-07-09 (design: group ordering + backend stance)**: Owner floated
  "five people picking dishes on their own phones, landing on my order
  list" and asked about Bluetooth/WiFi sharing. Wrote it up rather than
  built it (economics: this session is Fable; the build is Opus work):
  **ADR 0009** — group ordering shares *finished picks* as URL fragments
  via the OS share sheet (AirDrop/Messages) + QR fallback, merging into
  `cart.js` on the host's phone; rejected Web Bluetooth (impossible
  browser-to-browser, absent on iOS), serverless WebRTC (QR-scan
  handshake per guest, dies on phone lock), and a backend room (breaks
  no-backend — deferred). The ADR also records an **owner steer: "no
  backend" softened to "not yet"** — a lightweight Cloudflare Worker is
  an acceptable future direction, gated behind its own ADR. ROADMAP:
  note under the legend about the softened stance; new **Theme 1b**
  (full design sketch + acceptance criteria, effort M); the parked
  "shareable shortlist links" folds into the Theme 1b codec. Also
  backfilled ADR 0008 into the decisions index (was missing).

  **Next session (Opus, fresh):** build Theme 1b from the ROADMAP sketch
  + ADR 0009 — codec first (pure, unit-tested), then send UI (share
  sheet + local QR), then receive/merge with confirmation. No schema
  changes; bump sw VERSION; CDP-verify at 390px.
