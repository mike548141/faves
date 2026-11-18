// The full-size photo viewer, built once on first use and reused.
//
// Its own module because two pages open it and they want it for different
// photos: a restaurant menu's dish thumbnail (menu.js), and the recipe page's
// hero photo (recipe.js). On the recipe LIST the thumbnail opens the recipe
// instead, as the title does (owner, 2026-11-18) — the bigger photo belongs on
// the page you land on, where the hero is cropped to fill its frame and the
// viewer shows the whole picture.
//
// Not in the HTML of any page: a lightbox nobody opens should cost nothing,
// and building it here keeps the pages from carrying the same markup twice.

import { el } from "./dom.js";
import { wireDialog } from "./dialog.js";

let lightbox = null;

export function openPhoto(src, alt) {
  if (!lightbox) {
    const img = el("img", { className: "photo-full", alt: "" });
    const close = el("button", {
      type: "button",
      className: "photo-close",
      textContent: "✕",
      "aria-label": "Close",
    });
    lightbox = el("dialog", { className: "photo-lightbox" }, [close, img]);
    lightbox._img = img;
    document.body.append(lightbox);
    wireDialog(lightbox, { closeBtn: close });
    // The picture is the whole content, so a tap anywhere on it closes too —
    // the gesture every phone photo viewer already trained the reader to use.
    img.addEventListener("click", () => lightbox.close());
  }
  lightbox._img.src = src;
  lightbox._img.alt = alt || "";
  lightbox.showModal();
}
