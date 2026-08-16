// Getting your own data back into Faves: importing a downloaded backup
// (Theme 12b, ADR 0030).
//
// ONE APPLIER, ONE DOOR. Whatever arrives is parsed into an envelope and goes
// through the same `planImport` → `applyPersonalData` seam in personal-data.js,
// so the profile-collision question and the allergen-preference question are
// always asked the same way — there is no second, laxer path. The seam is kept
// general on purpose: sync (Theme 9 v2, ADR 0017) asks the same questions of
// the same data through sync-merge.js.
//
// The link-based "transfer to another device" (Theme 9 v1) that used to live
// here was removed on 2026-08-16 at the owner's direction: a one-shot copy sat
// awkwardly between the two things that actually keep data safe — the file
// backup, which restores a whole device, and continual sync, which keeps two
// devices in step.
//
// This is the thin UI half: every decision it renders comes from the pure plan,
// and every write goes back through the pure applier. Safety wording (allergens,
// "this deletes everything") stays English on purpose — reo.js's safety
// boundary — as do the interpolated counts the swap engine can't reach.

import { applyPersonalData, parsePersonalData, planImport } from "./personal-data.js";
import { favourites } from "./favourites.js";
import { settings, ALLERGEN_PREFS, DIETARY_PREFS } from "./settings.js";
import { ratings } from "./ratings.js";
import { deviceStorage, profiles, reloadProfileStores } from "./profiles.js";
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
 * questions it raises, and the two ways to apply it — merge, or replace the
 * whole device. Replace is offered because the payload is a whole-device
 * backup: it names every profile, so putting it in place of what's here can't
 * silently delete someone it never mentioned.
 */
export function importReview({ data, sourceLine, onApplied }) {
  const storage = deviceStorage;
  const decisions = {};

  const summary = el("div", { className: "import-summary" });
  const entriesBox = el("div", { className: "import-entries" });
  const status = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });
  status.tabIndex = -1; // focus target once the buttons are replaced by the outcome

  const applyBtn = el("button", { type: "button", className: "profile-btn profile-btn-primary", textContent: "Add to this device" });
  const replaceBtn = el("button", { type: "button", className: "profile-btn profile-btn-danger", textContent: "Replace everything instead" });

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
