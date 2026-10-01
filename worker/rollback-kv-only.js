// ROLLBACK ENTRY POINT — never the normal deploy (roadmap 510/340, ADR 0151).
//
// Deploy this only to go back to the KV-only Worker after the Durable Object
// cutover: `wrangler deploy -c <filled config> rollback-kv-only.js` (the
// positional script overrides `main`). Cloudflare will not roll a Worker back
// across a Durable Object class change (developers.cloudflare.com, Workers →
// Versions & deployments → Rollbacks, read 2026-10-02), so `wrangler rollback`
// to a pre-510/340 version is refused; this is the way back instead.
//
// It serves the frozen KV-only fetch handler, and it still exports SyncStore,
// because the namespace and its migration exist and a Worker bound to a
// Durable Object class must export it. No request reaches an object while this
// is deployed; their storage is left exactly as it was. Read worker/README.md
// ("Deploy owed — the Durable Object store", Rollback) before using it, and
// above all the roll-forward that must follow it.

export { default } from "./sync-worker-kv-only.js";
export { SyncStore } from "./sync-worker.js";
