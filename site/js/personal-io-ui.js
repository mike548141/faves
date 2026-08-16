// Getting your own data in and out of Faves: importing a downloaded backup
// (Theme 12b) and transferring one person's picks to their second device over a
// link or QR code (Theme 9 v1). Both are recorded in ADR 0030.
//
// ONE APPLIER, TWO DOORS. A file and a link differ only in how the bytes
// arrive; the moment they're parsed they are the same envelope and go through
// the same `planImport` → `applyPersonalData` seam in personal-data.js. So the
// profile-collision question and the allergen-preference question are asked
// identically whichever door you came in by — there is no second, laxer path.
//
// TRANSFER, NOT SYNC. The link is a one-shot seed: it carries what the sending
// device knew at the moment you made it, and nothing keeps the two in step
// afterwards. The wording says "transfer" everywhere and never "sync", because
// a user who thinks their phones are syncing will stop exporting backups.
// Continual sync is Theme 9 v2 and needs a backend (ADR 0017).
//
// This is the thin UI half: every decision it renders comes from the pure plan,
// and every write goes back through the pure applier. Safety wording (allergens,
// "this deletes everything") stays English on purpose — reo.js's safety
// boundary — as do the interpolated counts the swap engine can't reach.

import {
  applyPersonalData,
  envelopeFromTransfer,
  parsePersonalData,
  planImport,
} from "./personal-data.js";
import {
  buildTransferUrl,
  decodeTransfer,
  encodeTransfer,
  readTransferToken,
} from "./share-codec.js";
import { openShareDialog } from "./share-ui.js";
import { favourites, groupForShare } from "./favourites.js";
import { settings, ALLERGEN_PREFS, DIETARY_PREFS } from "./settings.js";
import { ratings } from "./ratings.js";
import { deviceStorage, profiles, reloadProfileStores } from "./profiles.js";
import { closeButton, wireDialog } from "./dialog.js";
import { el } from "./dom.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const people = (n) => `${n} ${n === 1 ? "person" : "people"}`;

/** Human names for the diet keys, so a difference reads as "Peanuts", not
 *  "contains-peanuts". Falls back to the raw key if the vocabulary grows. */
const PREF_LABEL = new Map([...DIETARY_PREFS, ...ALLERGEN_PREFS].map((p) => [p.key, p.label]));
const prefList = (keys) => (keys.length ? keys.map((k) => PREF_LABEL.get(k) ?? k).join(", ") : "none");

/** "8 August 2026" — the export date, so you can tell two backups apart. */
function exportedOn(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}

/** A labelled native radio — real keyboard and screen-reader semantics, and a
 *  44 px row, rather than a styled div pretending to be one. */
function radio(name, value, labelText, onPick) {
  const input = el("input", { type: "radio", name, value, className: "import-radio" });
  input.addEventListener("change", () => {
    if (input.checked) onPick(value);
  });
  return el("label", { className: "import-choice" }, [input, el("span", { textContent: labelText })]);
}

/**
 * The review a payload gets before a single byte is written: what's in it, any
 * questions it raises, and the two ways to apply it. Shared by the file import
 * and the transfer receive.
 *
 * `allowReplace` is false for a transfer — a link carries one person, so
 * "replace everything on this device" would delete the other profiles to make
 * room for a subset. Whole-device restore is the file's job.
 */
export function importReview({ data, sourceLine, allowReplace = true, onApplied }) {
  const storage = deviceStorage;
  const decisions = {};

  const summary = el("div", { className: "import-summary" });
  const entriesBox = el("div", { className: "import-entries" });
  const status = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });
  status.tabIndex = -1; // focus target once the buttons are replaced by the outcome

  const applyBtn = el("button", { type: "button", className: "profile-btn profile-btn-primary", textContent: "Add to this device" });
  const replaceBtn = el("button", { type: "button", className: "profile-btn profile-btn-danger", textContent: "Replace everything instead" });
  if (!allowReplace) replaceBtn.hidden = true;

  const confirmText = el("p", { className: "profile-confirm-text" });
  const confirmGo = el("button", { type: "button", className: "profile-btn profile-btn-danger", textContent: "Replace" });
  const confirmCancel = el("button", { type: "button", className: "profile-btn", textContent: "Cancel", "data-i18n": "generic.cancel" });
  const confirm = el("div", { className: "profile-confirm", role: "group", hidden: true }, [
    confirmText,
    el("div", { className: "profile-form-actions" }, [confirmGo, confirmCancel]),
  ]);
  confirm.setAttribute("aria-label", "Confirm replace");

  // Why "Add" is greyed out. A question can easily sit above the fold of the
  // sheet's own scroll, and a disabled button with no stated reason is the
  // worst of both — it looks broken rather than careful.
  const blocked = el("p", { className: "import-blocked", hidden: true });

  const actions = el("div", { className: "profile-form-actions" }, [applyBtn, replaceBtn]);
  const root = el("div", { className: "import-review" }, [summary, entriesBox, blocked, actions, confirm, status]);

  const currentPlan = () => planImport(storage, data, { mode: "merge", decisions });

  // --- the preview, shown before anything is applied ---------------------
  function renderSummary(plan) {
    const bits = [
      people(plan.totals.profiles),
      plural(plan.totals.favourites, "favourite"),
      plural(plan.totals.ratings, "rating"),
    ];
    const when = exportedOn(plan.exportedAt);
    summary.replaceChildren(
      el("p", { className: "settings-note", textContent: sourceLine + (when ? ` Saved ${when}.` : "") }),
      el("p", { className: "import-counts", textContent: bits.join(" · ") })
    );
  }

  // --- one block per person in the payload -------------------------------
  function dietBlock(entry) {
    if (!entry.diet) return null;
    const name = `import-diet-${entry.key}`;
    const box = el("fieldset", { className: "import-q import-q-safety" }, [
      el("legend", { textContent: `${entry.targetName}’s food preferences differ` }),
      // Both sides in full: a count ("2 differences") would be exactly the kind
      // of summary that lets someone approve a change they didn't read.
      el("p", { className: "import-diff", textContent: `On this device — needs: ${prefList(entry.diet.existing.dietary)}; allergens flagged: ${prefList(entry.diet.existing.avoid)}` }),
      el("p", { className: "import-diff", textContent: `In this data — needs: ${prefList(entry.diet.incoming.dietary)}; allergens flagged: ${prefList(entry.diet.incoming.avoid)}` }),
      el("p", { className: "settings-hint", textContent: "Allergen flags decide which warnings shout on a menu, so nothing here changes unless you say so." }),
    ]);
    const pick = (v) => {
      decisions[entry.key] = { ...decisions[entry.key], diet: v };
      refresh();
    };
    box.append(
      radio(name, "keep", "Keep what’s on this device", pick),
      radio(name, "incoming", "Use the ones in this data", pick),
      radio(name, "combine", "Flag both — keep every allergen from either", pick)
    );
    // Deliberately nothing pre-selected: a default here is a guess about
    // someone's allergies, and Add stays disabled until they answer.
    check(box, decisions[entry.key]?.diet);
    return box;
  }

  /** Re-tick the radio the user already chose after a re-render. Matched by
   *  value rather than a selector, so an id needs no CSS escaping. */
  function check(box, value) {
    if (!value) return;
    for (const input of box.querySelectorAll("input.import-radio")) {
      if (input.value === value) input.checked = true;
    }
  }

  function collisionBlock(entry) {
    if (!entry.collides) return null;
    const name = `import-who-${entry.key}`;
    const box = el("fieldset", { className: "import-q" }, [
      el("legend", { textContent: `Is this the same “${entry.candidateName}”?` }),
      el("p", {
        className: "settings-hint",
        textContent:
          entry.match === "id"
            ? `This data has a “${entry.name}” that shares an internal id with “${entry.candidateName}” on this device — which happens between two people's phones as well as between your own, so it isn't proof.`
            : `There's already a “${entry.candidateName}” on this device, but this one came from somewhere else.`,
      }),
    ]);
    const pick = (v) => {
      decisions[entry.key] = { ...decisions[entry.key], target: v };
      refresh();
    };
    box.append(
      radio(name, entry.candidateId, `Same person — merge into ${entry.candidateName}`, pick),
      radio(name, "new", `Different person — add ${entry.name} separately`, pick)
    );
    check(box, decisions[entry.key]?.target);
    return box;
  }

  function renderEntries(plan) {
    entriesBox.replaceChildren(
      ...plan.entries.map((entry) => {
        const what = [plural(entry.favourites, "favourite"), plural(entry.ratings, "rating")];
        if (entry.hasSettings) what.push("settings");
        const verb =
          entry.action === "new"
            ? "will be added as a new person"
            : entry.action === "merge"
              ? `will merge into ${entry.targetName}`
              : "needs a decision below";
        return el("div", { className: "import-entry" }, [
          el("p", { className: "import-entry-head", textContent: `${entry.name} — ${what.join(", ")}` }),
          el("p", { className: "settings-hint", textContent: verb }),
          collisionBlock(entry),
          dietBlock(entry),
        ]);
      })
    );
  }

  // Re-planning after every answer keeps the preview describing the import
  // that is actually about to happen, rather than the one first proposed —
  // answering "different person" makes that person's diet question vanish,
  // because there is no longer anything of theirs here to overwrite.
  function refresh() {
    const plan = currentPlan();
    if (!plan.ok) {
      root.replaceChildren(el("p", { className: "settings-note", textContent: plan.error }));
      return;
    }
    // Re-rendering replaces the radio that was just clicked, which would drop
    // keyboard focus to <body> mid-question. Put it back on its replacement.
    const was = document.activeElement;
    const mark = was?.classList?.contains("import-radio") ? { name: was.name, value: was.value } : null;
    renderSummary(plan);
    renderEntries(plan);
    if (mark) {
      // Iterated, not selected: a profile name can contain a quote, and these
      // radio names are built from one.
      for (const input of entriesBox.querySelectorAll("input.import-radio")) {
        if (input.name === mark.name && input.value === mark.value) input.focus();
      }
    }
    applyBtn.disabled = plan.blocking.length > 0;
    blocked.hidden = !applyBtn.disabled;
    blocked.textContent = applyBtn.disabled
      ? plan.blocking.length === 1
        ? `Answer the question above first: ${plan.blocking[0]}`
        : `${plan.blocking.length} questions above need an answer first.`
      : "";
  }

  function report(result) {
    if (!result.ok) {
      status.textContent = result.error;
      return;
    }
    const bits = [];
    if (result.created.length) bits.push(`added ${result.created.join(", ")}`);
    if (result.merged.length) bits.push(`updated ${result.merged.join(", ")}`);
    if (!result.merged.length && result.unchanged.length && !result.created.length) {
      bits.push(`${result.unchanged.join(", ")} already had all of this`);
    }
    if (result.favouritesAdded) bits.push(`${plural(result.favouritesAdded, "new favourite")}`);
    if (result.ratingsAdded) bits.push(`${plural(result.ratingsAdded, "new rating")}`);
    if (result.dietChanged.length) bits.push(`food preferences changed for ${result.dietChanged.join(", ")}`);
    if (result.orderRestored) bits.push("order tally restored");
    status.textContent = bits.length ? `Done — ${bits.join(", ")}.` : "Done — nothing here was new.";
    if (!result.persisted) {
      // Safari private mode and a full quota look the same from here: the
      // in-memory shim took the write and will forget it (store.js).
      status.textContent += " Your browser wouldn’t let Faves save this, so it will only last until you close the tab.";
    }
    // Re-point the live stores so hearts, marks and preferences update without
    // a page reload; profiles.reload() also repaints the Settings roster.
    profiles.reload();
    reloadProfileStores({ favourites, ratings, settings });
    entriesBox.replaceChildren();
    actions.hidden = true;
    // The buttons just vanished from under the keyboard: move focus to the
    // outcome rather than dropping it to <body>, so the result is announced
    // and there's somewhere to tab on from.
    status.focus();
    onApplied?.(result);
  }

  applyBtn.addEventListener("click", () => report(applyPersonalData(storage, data, { mode: "merge", decisions })));

  replaceBtn.addEventListener("click", () => {
    const names = profiles.list().map((p) => p.name).join(", ");
    confirmText.textContent =
      `Delete everything on this device — ${names} — and put this data in its place? ` +
      `Every favourite, rating and food preference now on this device goes, including flagged allergens. It can’t be undone.`;
    confirm.hidden = false;
    confirmGo.focus();
  });
  confirmCancel.addEventListener("click", () => {
    confirm.hidden = true;
    replaceBtn.focus();
  });
  confirmGo.addEventListener("click", () => {
    confirm.hidden = true;
    report(applyPersonalData(storage, data, { mode: "replace" }));
  });

  refresh();
  return root;
}

// --- Settings → Your data: import a downloaded file ----------------------

/** The import block for the "Your data" panel. Returns `{ node, close }`;
 *  `close()` clears an abandoned review when the panel is left. */
export function importControls() {
  const head = el("p", { className: "settings-sub", textContent: "Bring data back in" });
  head.dataset.i18n = "data.importTitle";
  const note = el("p", {
    className: "settings-hint",
    textContent:
      "Open a file you downloaded from Faves — on this device or another one. You'll see what's in it before anything changes.",
  });

  const input = el("input", { type: "file", id: "import-file", className: "import-file", accept: ".json,application/json" });
  const label = el("label", { className: "import-file-label", htmlFor: "import-file" }, [
    el("span", { textContent: "Choose a file", "data-i18n": "data.chooseFile" }),
  ]);
  const status = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });
  const slot = el("div", { className: "import-slot" });

  function clear() {
    slot.replaceChildren();
    status.textContent = "";
    input.value = ""; // so re-picking the same file fires `change` again
  }

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    slot.replaceChildren();
    let text;
    try {
      text = await file.text();
    } catch {
      status.textContent = "Couldn’t read that file. Try downloading it again.";
      return;
    }
    const parsed = parsePersonalData(text);
    if (!parsed.ok) {
      status.textContent = parsed.error;
      return;
    }
    status.textContent = "";
    slot.append(
      importReview({
        data: parsed.data,
        sourceLine: `From ${file.name}.`,
        allowReplace: true,
        onApplied: () => {
          input.value = "";
        },
      })
    );
  });

  return {
    node: el("div", { className: "import-block" }, [head, note, label, input, status, slot]),
    close: clear,
  };
}

// --- Settings → Your data: transfer to another device --------------------

/** The active profile's slice of the layer, as the codec wants it. Ratings are
 *  read from the raw scoped key because ratings.js exposes lookups, not the map.
 *  Exported for unit testing (personal-io-ui.test.js) — it is otherwise only
 *  called from transferControls() below. */
export function activeSlice() {
  let map = {};
  try {
    map = JSON.parse(deviceStorage.getItem(profiles.scopedKey("faves.ratings.v1")) || "{}");
  } catch {
    map = {}; // corrupt store — transfer the rest rather than nothing
  }
  return {
    profile: profiles.active(),
    groups: groupForShare(favourites.items()),
    ratings: map && typeof map === "object" ? map : {},
    // raw(), not get(): get() hard-resolves LOCAL to this device's concrete
    // language/units (ADR 0045), so a link made on an NZ phone would carry
    // "en"/"metric" onto the receiver — permanently destroying its own
    // "follow me wherever I am" preference (DEFAULTS in settings.js) instead
    // of transferring it. Currency is unaffected either way — get() never
    // resolves it; place.js resolves it per price (ADR 0029, ADR 0045).
    settings: settings.raw(),
  };
}

/** Every page lives at the site root, so the directory of whatever page you're
 *  on is the home page — a transfer link should never land on one venue's menu
 *  carrying someone else's `?id=`. */
const homeUrl = () => new URL(".", location.href).href;

export function transferControls() {
  const head = el("p", { className: "settings-sub", textContent: "Transfer to another device" });
  head.dataset.i18n = "data.transferTitle";
  const note = el("p", {
    className: "settings-hint",
    textContent:
      "Send the person browsing — their favourites, ratings and preferences — to your other phone or tablet as a link. " +
      "It's a one-off copy, not a sync: change something afterwards and the two won't follow each other.",
  });
  const btn = el("button", { type: "button", className: "settings-reset", textContent: "Make a transfer link" });
  btn.dataset.i18n = "data.transferButton";
  const status = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });

  btn.addEventListener("click", () => {
    const slice = activeSlice();
    if (!slice.groups.length && !Object.keys(slice.ratings).length) {
      status.textContent = `${slice.profile.name} hasn’t hearted or rated anything yet — there’s nothing to transfer.`;
      return;
    }
    status.textContent = "";
    // A realistic set of picks runs to thousands of characters, which is fine
    // for a link and far past what a QR code holds (qr.js tops out at 666
    // bytes) — share-ui reports that honestly rather than showing a dead
    // button. Measured figures are in ADR 0030. Past ~8000 characters some
    // messaging apps start mangling a URL, so say so before they try.
    const long = buildTransferUrl(encodeTransfer(slice), homeUrl()).length > 8000;
    openShareDialog({
      heading: "Transfer to another device",
      blurb:
        `Open this on your other device to copy ${slice.profile.name}'s favourites, ratings and preferences across. ` +
        `It's a one-off copy — nothing keeps the two in step afterwards. Anyone with the link gets the same copy, so send it to yourself.` +
        (long
          ? " This is a big one: if the link arrives broken, use “Download my data” and import the file instead."
          : ""),
      namePlaceholder: "Label this transfer (optional)",
      nameAriaLabel: "Label for this transfer",
      buildUrl: (name) =>
        buildTransferUrl(
          encodeTransfer({ ...slice, profile: { ...slice.profile, name: name?.trim() || slice.profile.name } }),
          homeUrl()
        ),
      shareTitle: "Faves — transfer my picks",
      shareText: "Open this on my other device to copy my Faves picks across.",
    });
  });

  return { node: el("div", { className: "transfer-block" }, [head, note, btn, status]) };
}

// --- the receive half ----------------------------------------------------

/**
 * Consume a `#xfer=` fragment on load and offer to merge it. Wired on every
 * screen (like the group-order receive) so a link opened from Messages works
 * wherever it lands. Merge only: a link carries one person, so offering to
 * replace the device would delete the people it doesn't mention.
 */
export function initTransferReceive() {
  const token = readTransferToken(location.hash);
  if (!token) return;
  // Consume the fragment first, so a refresh doesn't re-prompt and the picks
  // don't sit in the address bar.
  history.replaceState(null, "", location.pathname + location.search);

  const body = el("div", { className: "order-body share-body" });
  const close = closeButton();
  const dialog = el("dialog", { className: "recv-sheet", "aria-labelledby": "xfer-title" }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "order-head" }, [
        el("h2", { id: "xfer-title", className: "order-title", textContent: "Transfer from another device" }),
        close,
      ]),
      body,
    ]),
  ]);

  const decoded = decodeTransfer(token);
  const parsed = decoded ? parsePersonalData(envelopeFromTransfer(decoded)) : { ok: false };
  if (!parsed.ok) {
    body.append(
      el("p", {
        className: "order-caption",
        textContent: "That transfer link didn’t come through — make a fresh one on the other device.",
      })
    );
  } else {
    body.append(
      importReview({
        data: parsed.data,
        sourceLine: "From another device.",
        allowReplace: false,
      })
    );
  }

  dialog.addEventListener("close", () => dialog.remove());
  wireDialog(dialog, { closeBtn: close });
  document.body.append(dialog);
  dialog.showModal();
}
