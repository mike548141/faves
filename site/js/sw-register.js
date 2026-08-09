// Registers the service worker (Phase 5) and runs the update flow on top of it
// (ROADMAP Theme 16, ADR 0027). Its own module so all three HTML shells share
// it, and every path here is guarded so a failure can never break the app.
//
// Registering alone was not enough. A browser only re-fetches sw.js on a
// navigation (plus a background check about once a day), and a standalone PWA
// resumed from memory performs no navigation — so "kill it and relaunch" was
// the only thing that ever triggered an update check. Three pieces fix that:
// check on resume (throttled), tell the person when a new worker is waiting,
// and let their tap activate it. The decision rules live in sw-update.js, where
// `node --test` can execute them.

import { createUpdateGate, createReloadGuard, isUpdateReady } from "./sw-update.js";
import { showUpdateNotice } from "./update-notice.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(wireUpdates)
      .catch((err) => {
        console.error("Faves: service worker registration failed.", err);
      });
  });
}

function wireUpdates(registration) {
  // Captured at load: a page with no controller is on its first-ever install,
  // where there is no older version to replace and nothing to announce.
  const hadController = !!navigator.serviceWorker.controller;
  // The page load just fetched sw.js, so seed the throttle — a tab-switch three
  // seconds from now has nothing new to learn.
  const gate = createUpdateGate({ since: Date.now() });
  const guard = createReloadGuard();

  const offer = () => {
    try {
      showUpdateNotice(() => {
        guard.request();
        const waiting = registration.waiting;
        if (waiting) {
          // The new worker is holding in `waiting` on purpose (ADR 0027): it
          // takes over only when asked, so an old page is never served new
          // assets behind its back. The reload rides the controllerchange below.
          waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          // Already took over (another tab asked first) — just get the new page.
          if (guard.shouldReload()) location.reload();
        }
      });
    } catch (err) {
      // A broken notice must not break the app; the next cold start still
      // picks the new version up.
      console.error("Faves: could not show the update notice.", err);
    }
  };

  // A worker that finished installing in an earlier session is already waiting
  // when we register — there is no second `updatefound` to catch it.
  if (registration.waiting && hadController) offer();

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (isUpdateReady(installing.state, hadController)) offer();
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (guard.shouldReload()) location.reload();
  });

  // Check on resume. `visibilitychange` covers the standalone PWA coming back
  // from the app switcher; `focus` covers a desktop tab. Both are throttled
  // through one gate so the pair can't double up.
  const check = (event) => {
    if (!gate.claim(event.type, document.visibilityState)) return;
    registration.update().catch(() => {
      // Offline, or the origin is unreachable. Nothing to do and nothing worth
      // saying — the next resume tries again.
    });
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
}
