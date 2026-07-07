// Registers the service worker (Phase 5). Its own module so both HTML
// shells share it and a failure here can never break the app.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("Faves: service worker registration failed.", err);
    });
  });
}
