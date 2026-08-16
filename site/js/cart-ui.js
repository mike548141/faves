// Order tally UI: a floating "order" button (shown once there's something
// in it) and a dialog that lists the running order grouped by venue, with
// subtotals, a captioned estimated total, collect mode (tick off at
// pickup), and clear. Injected into whatever page calls initOrderUI(), so
// it rides along on the home, menu and recipe screens without duplicating
// markup. The model lives in cart.js; this is purely presentation + wiring.

import { order, groupByVenue, orderTotals } from "./cart.js";
import { encodeShare, decodeShare, buildShareUrl, readShareToken } from "./share-codec.js";
import { favourites, groupForShare } from "./favourites.js";
import { openShareDialog } from "./share-ui.js";
import { el } from "./dom.js";
import { selectionKey, selectionSummary } from "./addons.js";
import { dishId } from "./dish-id.js";
import { displayPrice, formatMoney } from "./place.js";

// A line, subtotal or total always carries the currency it is in — an order
// can span venues in different countries, and an unlabelled number then lies.
// Converted into the reader's currency where we can (ADR 0045), which is also
// what collapses a two-country order back into a single addable total.
const money = (n, currency) => {
  const shown = displayPrice(n, { currency });
  return formatMoney(shown.amount, shown.currency);
};
const tel = (p) => "tel:" + p.replace(/\s+/g, "");
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * The + / − / count control for one dish. Bound to the shared order store
 * and self-updating, so the menu row and the dialog line always agree.
 * `meta` = { venueId, venueName, phone, name, dishId?, price }.
 */
export function dishStepper(meta) {
  const wrap = el("div", { className: "stepper" });
  // The configuration this stepper counts (ADR 0048 §4). "Eggs on toast with
  // bacon" is a different line from "eggs on toast", so the stepper has to ask
  // about its own selection or it would show — and change — the wrong count.
  const sel = () => selectionKey(meta.options);
  // …and its own dish, by id: three rows can print "Cheeseburger" at three
  // prices, and asking by name gave all three steppers the first row's count
  // (ADR 0051).
  const id = () => dishId(meta);
  // Spoken labels name the configuration too: two "Add" buttons a thumb apart
  // that differ only in their sauces are indistinguishable to a screen reader.
  const said = () => {
    const s = selectionSummary(meta.options);
    return s ? `${meta.name} with ${s}` : meta.name;
  };
  function render() {
    const q = order.qtyOf(meta.venueId, id(), sel());
    wrap.dataset.qty = q;
    if (q === 0) {
      const add = el("button", {
        type: "button",
        className: "stepper-add",
        textContent: "＋ Add",
      });
      add.setAttribute("aria-label", `Add ${said()} to your order`);
      add.addEventListener("click", () => order.add(meta));
      wrap.replaceChildren(add);
    } else {
      const dec = el("button", { type: "button", className: "stepper-btn", textContent: "−" });
      dec.setAttribute("aria-label", `One fewer ${said()}`);
      dec.addEventListener("click", () => order.setQty(meta.venueId, id(), q - 1, sel()));
      const count = el("span", { className: "stepper-count", textContent: String(q) });
      const inc = el("button", { type: "button", className: "stepper-btn", textContent: "＋" });
      inc.setAttribute("aria-label", `One more ${said()}`);
      inc.addEventListener("click", () => order.add(meta));
      wrap.replaceChildren(dec, count, inc);
    }
  }
  render();
  order.subscribe(render);
  return wrap;
}

function lineRow(item, collectMode) {
  const price = el("span", {
    className: "order-line-price",
    textContent: item.price == null ? "—" : money(item.price * item.qty),
  });

  // What was asked for, read out the way you would say it at the counter —
  // "2× Iskender with Mild chilli, Garlic yogurt". Collect mode is someone
  // standing at the till reading the list aloud, so the configuration has to be
  // IN the spoken line, not a caption beside it.
  const config = selectionSummary(item.options);
  const spoken = config ? `${item.name} with ${config}` : item.name;

  if (collectMode) {
    const box = el("input", { type: "checkbox", className: "order-check", checked: item.collected });
    box.addEventListener("change", () =>
      order.toggleCollected(item.venueId, dishId(item), selectionKey(item.options)),
    );
    const label = el("label", { className: "order-collect-line" }, [
      box,
      el("span", { className: "order-line-name", textContent: `${item.qty}× ${spoken}` }),
    ]);
    const li = el("li", { className: "order-line" }, [label, price]);
    if (item.collected) li.classList.add("collected");
    return li;
  }

  return el("li", { className: "order-line" }, [
    dishStepper(item),
    el("span", { className: "order-line-name" }, [
      item.name,
      config ? el("span", { className: "order-line-config", textContent: config }) : null,
    ]),
    price,
  ]);
}

export function initOrderUI() {
  // Guard: only one instance per page even if two modules call this.
  if (document.querySelector(".order-fab")) return;

  const count = el("span", { className: "order-fab-count" });
  const fab = el("button", { type: "button", className: "order-fab", hidden: true }, [
    el("span", { "aria-hidden": "true", textContent: "🧾" }),
    el("span", { className: "order-fab-label", textContent: "Order" }),
    count,
  ]);

  const body = el("div", { className: "order-body" });
  const totalEl = el("span", { className: "order-total" });
  const collectBtn = el("button", { type: "button", className: "order-collect-toggle" }, [
    "Collect mode",
  ]);
  collectBtn.setAttribute("aria-pressed", "false");
  const clearBtn = el("button", { type: "button", className: "order-clear", textContent: "Clear" });
  const sendBtn = el("button", { type: "button", className: "order-send" }, [
    el("span", { "aria-hidden": "true", textContent: "📤 " }),
    "Send to the orderer",
  ]);

  const dialog = el("dialog", { className: "order-sheet", "aria-labelledby": "order-title" }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "order-head" }, [
        el("h2", { id: "order-title", className: "order-title", textContent: "Your order" }),
        (() => {
          const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
          b.setAttribute("aria-label", "Close");
          b.addEventListener("click", () => dialog.close());
          return b;
        })(),
      ]),
      body,
      el("div", { className: "order-foot" }, [
        el("div", { className: "order-total-row" }, [
          el("span", { textContent: "Estimated total" }),
          totalEl,
        ]),
        el("p", {
          className: "order-caption",
          textContent: "Estimated from our menu — confirm at the till.",
        }),
        sendBtn,
        el("div", { className: "order-actions" }, [collectBtn, clearBtn]),
      ]),
    ]),
  ]);

  // ----- Send: hand your finished picks to the orderer (Theme 1b, ADR 0009),
  // via the shared share dialog (share sheet / copy link / QR). It re-encodes
  // the current order each time an action fires, so a late name edit is caught.
  sendBtn.addEventListener("click", () => {
    openShareDialog({
      heading: "Send your picks",
      blurb: "Hand your order to whoever's phoning it in — AirDrop, Messages, a copied link, or a QR to scan. Nothing is sent to a server.",
      nameAriaLabel: "Your name, so they know whose picks these are",
      shareTitle: "My Faves order",
      shareText: "Here are my picks:",
      buildUrl: (name) => {
        const token = encodeShare({ type: "order", label: name, groups: order.groups() });
        // Land the host on the home screen; the receive handler runs on every page.
        return buildShareUrl(token, location.origin + "/");
      },
    });
  });

  document.body.append(fab, dialog);

  let collectMode = false;
  let confirmingClear = false;

  function renderBody() {
    const groups = order.groups();
    body.replaceChildren();

    if (groups.length === 0) {
      body.append(
        el("p", {
          className: "order-empty",
          textContent: "No items yet. Tap ＋ on a dish to start your order.",
        })
      );
      return;
    }

    for (const g of groups) {
      const head = el("div", { className: "order-group-head" }, [
        el("h3", { className: "order-group-name", textContent: g.venueName }),
        g.phone
          ? (() => {
              const a = el("a", { className: "order-call", href: tel(g.phone) }, [
                el("span", { "aria-hidden": "true", textContent: "📞" }),
                " Call",
              ]);
              a.setAttribute("aria-label", `Call ${g.venueName} to order`);
              return a;
            })()
          : null,
      ]);
      const lines = el("ul", { className: "order-lines" }, g.items.map((i) => lineRow(i, collectMode)));
      const subtotal = el("div", { className: "order-subtotal" }, [
        el("span", { textContent: plural(g.count, "item") }),
        el("span", {
          className: "order-subtotal-amount",
          textContent: money(g.subtotal, g.currency) + (g.hasUnpriced ? "+" : ""),
        }),
      ]);
      body.append(el("section", { className: "order-group" }, [head, lines, subtotal]));
    }
  }

  function renderTotal() {
    const anyUnpriced = order.groups().some((g) => g.hasUnpriced);
    // An order spanning two countries used to read "$42.50 + £18", because the
    // two were not addable. With rates they usually are: convert each currency's
    // subtotal into whatever the reader is seeing and, when they all land in the
    // same money, add them into ONE number — which is what someone splitting a
    // bill actually wants. Where a rate is missing the old joined form survives,
    // because a wrong single total would be worse than an awkward true one.
    const totals = orderTotals(order.items());
    const shown = totals.map((x) => displayPrice(x.total, { currency: x.currency }));
    const currencies = new Set(shown.map((s) => s.currency));
    const text =
      shown.length === 0
        ? money(0)
        : currencies.size === 1
          ? formatMoney(
              shown.reduce((sum, s) => sum + s.amount, 0),
              shown[0].currency
            )
          : shown.map((s) => formatMoney(s.amount, s.currency)).join(" + ");
    totalEl.textContent = text + (anyUnpriced ? "+" : "");
  }

  function renderFab() {
    const n = order.count();
    fab.hidden = n === 0;
    count.textContent = String(n);
    fab.setAttribute("aria-label", `Your order — ${plural(n, "item")}`);
  }

  function resetClear() {
    confirmingClear = false;
    clearBtn.textContent = "Clear";
    clearBtn.classList.remove("confirming");
  }

  function refresh() {
    renderFab();
    sendBtn.hidden = order.count() === 0; // nothing to send from an empty order
    if (dialog.open) {
      renderBody();
      renderTotal();
    }
  }

  fab.addEventListener("click", () => {
    collectMode = false;
    collectBtn.setAttribute("aria-pressed", "false");
    resetClear();
    renderBody();
    renderTotal();
    dialog.showModal();
  });

  collectBtn.addEventListener("click", () => {
    collectMode = !collectMode;
    collectBtn.setAttribute("aria-pressed", String(collectMode));
    renderBody();
  });

  clearBtn.addEventListener("click", () => {
    if (!confirmingClear) {
      confirmingClear = true;
      clearBtn.textContent = "Clear — sure?";
      clearBtn.classList.add("confirming");
      return;
    }
    order.clear();
    resetClear();
  });

  dialog.addEventListener("close", resetClear);
  dialog.addEventListener("click", (e) => {
    // Backdrop click (target is the dialog itself, not its content) closes.
    if (e.target === dialog) dialog.close();
  });

  order.subscribe(refresh);
  // Keep in step if the order changes in another tab.
  window.addEventListener("storage", (e) => {
    if (e.key === "faves.order.v1") order.reload();
  });

  // ----- Receive: someone shared their picks with us (Theme 1b) -----------
  // Confirm before merging (never a silent add), and fail soft on a dud link.
  function showReceive(decoded) {
    const recvBody = el("div", { className: "order-body share-body" });
    const actions = el("div", { className: "order-actions" });
    const recvDialog = el("dialog", { className: "recv-sheet", "aria-labelledby": "recv-title" }, [
      el("div", { className: "order-inner" }, [
        el("div", { className: "order-head" }, [
          el("h2", { id: "recv-title", className: "order-title" }),
          (() => {
            const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
            b.setAttribute("aria-label", "Close");
            b.addEventListener("click", () => recvDialog.close());
            return b;
          })(),
        ]),
        recvBody,
        el("div", { className: "order-foot" }, [actions]),
      ]),
    ]);
    const title = recvDialog.querySelector("#recv-title");

    const closeBtn = (label = "OK") => {
      const b = el("button", { type: "button", className: "order-send", textContent: label });
      b.addEventListener("click", () => recvDialog.close());
      return b;
    };

    if (!decoded) {
      title.textContent = "That link didn't work";
      recvBody.append(
        el("p", {
          className: "order-caption",
          textContent: "This shared link didn't come through — ask them to send it again.",
        })
      );
      actions.append(closeBtn());
    } else if (decoded.type === "shortlist") {
      // Someone shared their favourites; confirm, then merge into ours.
      const whose = decoded.label ? `${decoded.label}'s` : "these";
      title.textContent = `Add ${whose} ${plural(decoded.items.length, "favourite")}?`;
      const list = el("ul", { className: "recv-list" });
      for (const g of groupForShare(decoded.items)) {
        // A group's dishes may arrive as bare name strings (an OLD-shaped
        // producer, or a link decoded before dish ids existed) or as
        // `{ name, dishId? }` objects (favourites.js's groupForShare today) —
        // read the name whichever shape a given element is.
        const bits = g.dishes.map((d) => (typeof d === "string" ? d : d.name));
        if (g.venueFav) bits.unshift("the place");
        list.append(
          el("li", { className: "recv-group" }, [
            el("span", { className: "recv-venue", textContent: (g.isRecipe ? "🏠 " : "🍽️ ") + (g.venueName || "A place") }),
            el("span", { className: "recv-lines", textContent: bits.join(", ") }),
          ])
        );
      }
      recvBody.append(list);
      const no = el("button", { type: "button", className: "order-clear", textContent: "Not now" });
      no.addEventListener("click", () => recvDialog.close());
      const yes = el("button", { type: "button", className: "order-send", textContent: "Add to favourites" });
      yes.addEventListener("click", () => {
        const added = favourites.merge(decoded.items);
        title.textContent = added ? "Added to your favourites" : "Already in your favourites";
        recvBody.replaceChildren(
          el("p", {
            className: "order-caption",
            textContent: added
              ? `${plural(added, "favourite")} added — find them under Favourites.`
              : "You'd already saved all of these.",
          })
        );
        actions.replaceChildren(closeBtn("Done"));
      });
      actions.append(no, yes);
    } else {
      const whose = decoded.label ? `${decoded.label}'s` : "these";
      const n = decoded.items.reduce((s, i) => s + i.qty, 0);
      title.textContent = `Add ${whose} ${plural(n, "item")}?`;
      const list = el("ul", { className: "recv-list" });
      for (const g of groupByVenue(decoded.items)) {
        list.append(
          el("li", { className: "recv-group" }, [
            el("span", { className: "recv-venue", textContent: g.venueName || "Order" }),
            el("span", {
              className: "recv-lines",
              textContent: g.items.map((i) => `${i.qty}× ${i.name}`).join(", "),
            }),
          ])
        );
      }
      recvBody.append(list);
      const no = el("button", { type: "button", className: "order-clear", textContent: "Not now" });
      no.addEventListener("click", () => recvDialog.close());
      const yes = el("button", { type: "button", className: "order-send", textContent: "Add to my order" });
      yes.addEventListener("click", () => {
        order.merge(decoded.items);
        recvDialog.close();
        // Show the merged result straight away.
        collectMode = false;
        collectBtn.setAttribute("aria-pressed", "false");
        renderBody();
        renderTotal();
        dialog.showModal();
      });
      actions.append(no, yes);
    }

    recvDialog.addEventListener("close", () => recvDialog.remove());
    recvDialog.addEventListener("click", (e) => {
      if (e.target === recvDialog) recvDialog.close();
    });
    document.body.append(recvDialog);
    recvDialog.showModal();
  }

  function handleIncomingShare() {
    const token = readShareToken(location.hash);
    if (!token) return;
    // Consume the fragment first, so a refresh or a re-share doesn't re-prompt
    // and the picks don't linger in the address bar.
    history.replaceState(null, "", location.pathname + location.search);
    showReceive(decodeShare(token));
  }

  renderFab();
  refresh();
  handleIncomingShare();
}
