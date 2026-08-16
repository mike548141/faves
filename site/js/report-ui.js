// "Tell us what's wrong or missing" — the UI half (ROADMAP Theme 4c-i, ADR 0028).
// report.js composes the text; this owns the entry points, the dialog and the
// hand-off. Model/UI split, same as every other feature here.
//
// THREE ENTRY POINTS, all raised from where the problem is — that's the whole
// design call. A report from a dish row already knows the venue, the dish and
// the price we're showing, so the owner can act on it without a conversation; a
// blank "contact us" form cannot.
//   1. a ⚑ on the dish row's action cluster, beside the ♥ and the stepper
//   2. a "Something wrong here?" row at the foot of the venue contact card
//   3. "Suggest or report" in the ⋯ menu, on every screen (home included)
//
// TRANSPORT (owner-ruled 2026-08-09, ADR 0028): compose on the device, hand to
// the OS share sheet **or** the clipboard. Both are first-class buttons, not a
// fallback afterthought — navigator.share needs a user gesture and doesn't exist
// on Firefox desktop, so a phone-shaped design would strand desktop reporters.
// If both paths fail the composed text is revealed on screen, selectable, and
// nothing typed is lost. No network call anywhere: the whole flow works in
// flight mode, like the rest of the app.
//
// SAFETY. A report is a suggestion to the person who keeps Faves, never a live
// edit — nothing sent from here changes what the app shows or flags. The dialog
// says so before you send, and report.js repeats it inside the message. The copy
// must never imply the correction takes effect.
//
// REO. Structural chrome carries data-i18n keys. Deliberately English: the
// allergen report type, the safety note, the status/result prose, and the
// composed report itself (it's a message to the person who maintains the data,
// not app chrome) — reo.js's safety boundary and its "error prose stays English"
// rule, which they inherit by simply having no key.

import { el } from "./dom.js";
import { wireDialog } from "./dialog.js";
import { translate } from "./reo.js";
import { dishId } from "./dish-id.js";
import { canNativeShare, copyText, tryNativeShare } from "./share-core.js";
import { installedVersions } from "./versions.js";
import { composeReport, reportSubject, typesForScope } from "./report.js";

// Verbatim-inherited allergen framing (settings-ui.js's caveat opens the same
// way), then the never-a-live-edit rule in the same breath. English on purpose.
const SAFETY =
  "⚠ Always confirm for allergies. This is a suggestion to the person who keeps " +
  "Faves — it doesn’t change anything in the app. Nothing you send here edits a " +
  "menu, a price or an allergen tag; a person checks it and updates the data.";

// One counter for the ids/names a dialog needs, so two dialogs opened in a
// session (or a stale one mid-close) can never collide on `for=`/radio grouping.
let seq = 0;

// What this device has installed (versions.js reads the SW cache names). Fetched
// once per page and cached: CacheStorage is async, but navigator.share must be
// called synchronously inside the click, so the value has to be in hand by then.
let installed = { shell: null, data: null };
let versionsPromise = null;
function loadVersions() {
  if (!versionsPromise) {
    versionsPromise = installedVersions().then((v) => (installed = v));
  }
  return versionsPromise;
}

// The page as a link, WITHOUT the fragment. On the home screen the hash may be
// carrying a shared order or shortlist token (share-codec.js) — someone else's
// picks have no business riding along in a report. Dish reports add their own
// clean #dish- anchor below.
const pageUrl = () => location.origin + location.pathname + location.search;

const venueCtx = (r) => ({ id: r.id, name: r.name, verified: r.verified ?? null });
const dishCtx = (item) => ({
  name: item.name,
  price: item.price ?? null,
  tags: item.tags || [],
  code: item.code ?? null,
});

/**
 * Open the report dialog.
 *   scope — "dish" | "venue" | "app"; decides which report types are offered
 *   venue, dish — context objects (see report.js); omitted for an app report
 *   url — deep link to what the reporter is looking at
 * Built fresh and removed on close, so callers hold no state.
 */
export function openReportDialog({ scope, venue = null, dish = null, url = pageUrl() }) {
  const n = ++seq;
  const types = typesForScope(scope);
  const titleId = `report-title-${n}`;
  const noteId = `report-note-${n}`;

  // Real radios in a fieldset: keyboard-operable and announced as a group for
  // free, which a row of toggle buttons would have to reimplement badly.
  // Scope-dependent, and only the correction wording has a reo key — "He aha te
  // hē?" is literally "what is the error?", which is right over a list of things
  // that are wrong and wrong over "suggest a place". The app legend falls through
  // to English rather than ship an unverified translation.
  const legend = el("legend", { className: "report-legend" });
  if (scope === "app") {
    legend.textContent = "What’s this about?";
  } else {
    legend.textContent = "What’s wrong?";
    legend.setAttribute("data-i18n", "report.what");
  }
  const fieldset = el("fieldset", { className: "report-types" }, [legend]);
  const radios = [];
  for (const [i, type] of types.entries()) {
    const input = el("input", {
      type: "radio",
      className: "report-radio",
      name: `report-type-${n}`,
      value: type.key,
      checked: i === 0,
    });
    // Land focus on the first choice rather than the ✕ — the choice is the task.
    if (i === 0) input.autofocus = true;
    const label = el("span", { textContent: type.label });
    // No key on the allergen type (reo.js safety boundary) ⇒ it stays English.
    if (type.i18n) label.setAttribute("data-i18n", type.i18n);
    radios.push(input);
    fieldset.append(el("label", { className: "report-type" }, [input, label]));
  }

  const note = el("textarea", {
    id: noteId,
    className: "report-note",
    rows: 3,
    maxLength: 600,
    // Placeholder stays English: it carries an interpolated-looking example with
    // a price in it, and reo.js swaps whole strings only.
    placeholder: "e.g. it was $19.50 on the board tonight",
  });

  const preview = el("textarea", { className: "report-text", readOnly: true, rows: 14 });
  preview.setAttribute("aria-label", "The report that will be sent");
  const previewWrap = el("details", { className: "report-preview" }, [
    el("summary", {
      className: "report-preview-summary",
      "data-i18n": "report.preview",
      textContent: "See what gets sent",
    }),
    preview,
  ]);

  const status = el("p", { className: "share-status report-status" });
  status.setAttribute("role", "status");

  const shareBtn = el("button", {
    type: "button",
    className: "order-send report-share",
    "data-i18n": "report.share",
    textContent: "Share…",
  });
  // No OS share sheet here (many desktops) ⇒ Copy stands alone rather than
  // offering a button that can only fail.
  if (!canNativeShare()) shareBtn.hidden = true;
  const copyBtn = el("button", {
    type: "button",
    className: "order-collect-toggle report-copy",
    "data-i18n": "report.copy",
    textContent: "Copy",
  });

  const closeBtn = el("button", {
    type: "button",
    className: "order-close",
    textContent: "✕",
    "aria-label": "Close",
    "data-i18n-aria": "generic.close",
  });

  const context = venue
    ? el("p", {
        className: "order-caption report-context",
        textContent: dish ? `${dish.name} · ${venue.name}` : venue.name,
      })
    : null;

  const dialog = el("dialog", { className: "report-sheet", "aria-labelledby": titleId }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "report-head" }, [
        el("h2", {
          id: titleId,
          className: "order-title",
          "data-i18n": scope === "app" ? "report.titleApp" : "report.title",
          textContent: scope === "app" ? "Suggest or report" : "Something wrong here?",
        }),
        closeBtn,
      ]),
      el("div", { className: "order-body report-body" }, [
        context,
        fieldset,
        el("label", {
          className: "report-note-label",
          htmlFor: noteId,
          "data-i18n": "report.note",
          textContent: "Anything to add? (optional)",
        }),
        note,
        el("p", { className: "report-safety", textContent: SAFETY }),
        el("div", { className: "order-actions" }, [shareBtn, copyBtn]),
        status,
        previewWrap,
      ]),
    ]),
  ]);

  const chosen = () => radios.find((r) => r.checked)?.value ?? types[0]?.key;
  const currentText = () =>
    composeReport({
      type: chosen(),
      venue,
      dish,
      note: note.value,
      versions: installed,
      url,
    });

  // The composed text lives in the preview at all times, so it is already on
  // screen (and selectable) before any hand-off is attempted — that's what makes
  // "never lose what was typed" true even if both transports fail.
  const refresh = () => {
    preview.value = currentText();
  };
  refresh();
  loadVersions().then(refresh);
  for (const r of radios) r.addEventListener("change", refresh);
  note.addEventListener("input", refresh);

  // Both transports failed (or the clipboard is blocked / the origin isn't
  // secure): open the preview, select it, and say what to do with it. The dialog
  // stays open — closing it here would throw away the report.
  function revealText() {
    previewWrap.open = true;
    preview.focus();
    preview.select();
    status.textContent =
      "Copy this text and send it to whoever shared Faves with you.";
  }

  async function copyPath() {
    if (await copyText(preview.value)) {
      status.textContent =
        "Copied. Paste it into a message to whoever shared Faves with you.";
      return true;
    }
    revealText();
    return false;
  }

  shareBtn.addEventListener("click", async () => {
    // Compose synchronously first: navigator.share must be reached inside the
    // gesture, and `preview.value` is already current.
    const r = await tryNativeShare({ title: reportSubject({ type: chosen(), venue, dish }), text: preview.value });
    if (r === "shared") {
      status.textContent = "Sent — thank you.";
      return;
    }
    // "dismissed" = they closed the sheet themselves; stay quiet and leave the
    // report on screen. A genuine miss falls through to the clipboard.
    if (r === "unavailable") await copyPath();
  });

  copyBtn.addEventListener("click", copyPath);

  dialog.addEventListener("close", () => dialog.remove());
  wireDialog(dialog, { closeBtn });

  document.body.append(dialog);
  // The boot translate() pass already ran; translate this subtree now it exists.
  translate(dialog);
  dialog.showModal();
  return dialog;
}

/**
 * The ⚑ on a dish row — "something about this dish is wrong". Sits in the same
 * action cluster as the ♥ and the order stepper. `r` is the loaded restaurant,
 * `item` the menu item as rendered, so the report carries the exact price and
 * tags on screen.
 */
export function dishReportButton(r, item) {
  const btn = el("button", { type: "button", className: "dish-report", textContent: "⚑" });
  btn.setAttribute("aria-label", `Report something wrong with ${item.name}`);
  btn.addEventListener("click", (e) => {
    // Dish rows can sit inside a link (recipes); never navigate on a report tap.
    e.preventDefault();
    e.stopPropagation();
    openReportDialog({
      scope: "dish",
      venue: venueCtx(r),
      dish: dishCtx(item),
      // The anchor of the row the ⚑ was tapped on. With three "Cheeseburger"
      // rows at three prices, a report that links to whichever one came first
      // sends the owner to the wrong dish.
      url: `${pageUrl()}#dish-${dishId(item)}`,
    });
  });
  return btn;
}

/** The last row of the venue contact card — "something about this place is wrong". */
export function venueReportRow(r) {
  const btn = el("button", { type: "button", className: "contact-row contact-report" }, [
    el("span", { className: "contact-ico", textContent: "⚑", "aria-hidden": "true" }),
    el("span", { className: "contact-text" }, [
      el("span", {
        className: "contact-label",
        "data-i18n": "report.contactLabel",
        textContent: "Something wrong?",
      }),
      el("span", {
        className: "contact-value",
        "data-i18n": "report.contactValue",
        textContent: "Tell us what needs fixing",
      }),
    ]),
  ]);
  btn.addEventListener("click", () =>
    openReportDialog({ scope: "venue", venue: venueCtx(r), url: pageUrl() })
  );
  return btn;
}

/**
 * The general "Suggest or report" item in the ⋯ menu — a place we're missing, or
 * a bug/idea about the app. Present on every screen (the markup is in both
 * shells), so feedback never depends on being on the right page.
 */
export function initReportEntry() {
  const btn = document.getElementById("report-btn");
  // Guard against a double-init wiring the opener twice.
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.hidden = false; // JS is present — reveal it (no dead no-JS chrome)
  btn.addEventListener("click", () => openReportDialog({ scope: "app", url: pageUrl() }));
}
