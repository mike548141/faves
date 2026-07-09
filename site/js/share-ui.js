// The "send" half of group sharing (Theme 1b, ADR 0009): a modal that hands a
// share URL to the OS share sheet (AirDrop / Messages), a copied link, or a
// scan-me QR code. One dialog serves both payload types — the order sheet
// sends an order, the Favourites view sends a shortlist — so the affordances
// stay identical and there's a single place to get the fallbacks right. The
// caller supplies a `buildUrl(name)` that encodes the token (via share-codec)
// and returns the full URL; the optional name is the sender's label. Presence
// only: the receive/merge half lives in cart-ui.js (it consumes the fragment
// on load, on every screen).
//
// The order-sheet family stays English for now — the te reo pass for these
// strings is deferred (they need interpolation reo.js doesn't have yet).

import { encodeQR } from "./qr.js";

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.includes("-")) node.setAttribute(k, v);
    else node[k] = v;
  }
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};

// Paint a QR of `url` onto `canvas`, dark-on-light with a 4-module quiet zone.
// Colours are hard-coded (not theme tokens): a scanner needs dark modules on a
// light field regardless of the page's light/dark mode. Throws (via encodeQR)
// if the URL is too long for the largest supported symbol — caller handles it.
function drawQR(canvas, url) {
  const { size, modules } = encodeQR(url);
  const quiet = 4;
  const dim = size + quiet * 2;
  const scale = Math.max(2, Math.floor(300 / dim)); // aim for a ~260–300px symbol
  const px = dim * scale;
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = "#000";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    }
  }
}

/**
 * Open the share modal. Options:
 *   heading, blurb          — dialog title and caption
 *   namePlaceholder, nameAriaLabel — the optional sender-name field
 *   buildUrl(name)          — returns the share URL for the current name
 *   shareTitle, shareText   — navigator.share metadata
 * The dialog is created fresh and removed on close, so callers hold no state.
 */
export function openShareDialog({
  heading,
  blurb,
  namePlaceholder = "Your name (optional)",
  nameAriaLabel = "Your name",
  buildUrl,
  shareTitle = "Faves",
  shareText = "",
}) {
  const nameInput = el("input", { type: "text", className: "share-name", maxLength: 40, placeholder: namePlaceholder });
  nameInput.setAttribute("aria-label", nameAriaLabel);

  const status = el("p", { className: "share-status" });
  status.setAttribute("role", "status");
  const linkField = el("input", { type: "text", className: "share-link", readOnly: true, hidden: true });
  linkField.setAttribute("aria-label", "Shareable link — copy and send it");

  const shareBtn = el("button", { type: "button", className: "order-send", textContent: "Share…" });
  const copyBtn = el("button", { type: "button", className: "order-collect-toggle", textContent: "Copy link" });
  // navigator.share is the AirDrop/Messages path (iOS/most mobile); where it's
  // absent (many desktops) fall back to Copy link alone.
  if (!(typeof navigator !== "undefined" && navigator.share)) shareBtn.hidden = true;

  const qrBtn = el("button", { type: "button", className: "order-collect-toggle", textContent: "Show QR code" });
  qrBtn.setAttribute("aria-expanded", "false");
  const qrCanvas = el("canvas", { className: "share-qr-canvas" });
  qrCanvas.setAttribute("role", "img");
  qrCanvas.setAttribute("aria-label", "QR code of your share link — scan it with the other phone's camera");
  const qrWrap = el("div", { className: "share-qr", hidden: true }, [
    qrCanvas,
    el("p", { className: "order-caption", textContent: "Point the other phone's camera at this." }),
  ]);

  const dialog = el("dialog", { className: "share-sheet", "aria-labelledby": "share-title" }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "order-head" }, [
        el("h2", { id: "share-title", className: "order-title", textContent: heading }),
        (() => {
          const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
          b.setAttribute("aria-label", "Close");
          b.addEventListener("click", () => dialog.close());
          return b;
        })(),
      ]),
      el("div", { className: "order-body share-body" }, [
        el("p", { className: "order-caption", textContent: blurb }),
        nameInput,
        el("div", { className: "order-actions" }, [shareBtn, copyBtn]),
        qrBtn,
        qrWrap,
        linkField,
        status,
      ]),
    ]),
  ]);

  const currentUrl = () => buildUrl(nameInput.value);

  function hideQR() {
    qrWrap.hidden = true;
    qrBtn.setAttribute("aria-expanded", "false");
    qrBtn.textContent = "Show QR code";
  }

  shareBtn.addEventListener("click", async () => {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: currentUrl() });
      status.textContent = "Sent.";
    } catch (err) {
      // AbortError = the user closed the share sheet themselves; stay quiet.
      if (err && err.name !== "AbortError") status.textContent = "Couldn't open the share sheet — try Copy link.";
    }
  });

  copyBtn.addEventListener("click", async () => {
    const url = currentUrl();
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Link copied — paste it to them.";
    } catch {
      // Clipboard blocked (or non-HTTPS origin): reveal the link to copy by hand.
      linkField.hidden = false;
      linkField.value = url;
      linkField.focus();
      linkField.select();
      status.textContent = "Copy this link and send it to them.";
    }
  });

  qrBtn.addEventListener("click", () => {
    if (!qrWrap.hidden) {
      hideQR();
      return;
    }
    try {
      drawQR(qrCanvas, currentUrl());
      qrWrap.hidden = false;
      qrBtn.setAttribute("aria-expanded", "true");
      qrBtn.textContent = "Hide QR code";
      status.textContent = "";
    } catch {
      // Only trips on an implausibly huge share (beyond the largest symbol).
      status.textContent = "This is too big for a QR code — use Copy link.";
    }
  });

  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
