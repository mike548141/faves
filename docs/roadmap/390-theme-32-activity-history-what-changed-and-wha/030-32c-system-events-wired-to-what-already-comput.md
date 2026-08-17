- [ ] **32c — system events, wired to what already computes them** `[S][js]`

`versions.js` / `sw-update.js` / `cache-refresh.js` already know when the shell
or data version moved and when a refresh was taken. Emit on those transitions.
Nothing new to detect; the work is not throwing the fact away.
