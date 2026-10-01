// The Settings topic for continual cross-device sync (ROADMAP Theme 9 v2,
// ADR 0017, ADR 0060). This is the UI half only — every decision about
// *whether* something changed lives in sync.js/sync-merge.js; this module
// just renders whatever `sync.status()` says and forwards taps to the five
// verbs sync.js exposes (enable/join/resolve/disable/syncNow).
//
// A STATE MACHINE OF VIEWS, NOT A FLAT PANEL. The six views the brief names
// (off, just-turned-on, on, use-an-existing-code, needs-decision, error) — and
// a seventh, paused, since roadmap 510/090, and an eighth, the no-base
// question, since 510/390 — are
// genuinely different screens, not one screen with things hidden — so this
// module tracks a `viewKey` computed from the engine's status plus two purely
// local flags (`joining`, `justOn` — see computeViewKey below) and only tears
// down and rebuilds the DOM when that key actually changes. Two consequences
// fall out of that one decision:
//   • Idle <-> syncing never rebuilds anything (both map to the "on" view), so
//     a background sync completing while someone is reading the panel cannot
//     interrupt them — only the status line's text (a role="status" live
//     region) updates in place.
//   • A structural change always moves focus deliberately (render()'s
//     hadFocus guard, below) — the house rule this repo has already been
//     burnt by once: a control that hides or disables *itself* while it has
//     focus drops focus to <body> and kills every keyboard handler scoped to
//     that subtree. Because sync.js's own setState() can fire synchronously
//     and *reentrantly* mid-click (writeConfig+setState(IDLE) both run before
//     the first `await` inside enable()/join(), so the subscriber below can
//     run — and tear out the very button that is still focused — before this
//     module's own click handler gets control back), focus management can't
//     live in the click handlers at all. It lives in render() itself, so it
//     covers every path that can change the view: a click here, a background
//     emit, or sync.js calling back into us mid-call.
//
// THE CODE IS THE ENCRYPTION KEY, NEVER A LINK. ADR 0017: the sync code is a
// bearer secret — whoever holds it can read and write the paired data. It is
// therefore never written into a URL, `location.hash`, or handed to
// `navigator.share`/an OS share sheet (any of which can land it in browser
// history or a messaging app's own log). Copying goes through the clipboard
// API only, with a manual select-to-copy fallback (`share-link`'s pattern,
// reused). The QR encodes the bare code string — not a URL — for the same
// reason: a scanner that recognises a URL will offer to "open" it, which is
// exactly the share-sheet-adjacent path the code must never take.

import { sync, OFF, SYNCING, ERROR, NEEDS_DECISION, PAUSED, RELOAD_NEEDED, KEEP_SYNCED, ADD_EXTRAS } from "./sync.js";
import { CONFLICT_NO_BASE } from "./sync-merge.js";
import { describeEntry, syncLogText } from "./sync-log.js";
import { isValidSyncCode } from "./sync-code.js";
import { encodeQR } from "./qr.js";
import { copyText } from "./share-core.js";
import { DIETARY_PREFS, ALLERGEN_PREFS } from "./settings.js";
import { el } from "./dom.js";

// ADR 0017 addendum 2, verbatim: "no accounts" is misleading once there is a
// sign-in-and-sync flow that *looks* like an account, so this states what we
// don't collect and can't do instead of reaching for that phrase.
const OFF_INTRO_1 =
  "Keep your favourites, ratings and food preferences the same on your " +
  "phone, tablet and laptop. Turn it on, get a code, then enter that code " +
  "on your other device.";
const OFF_INTRO_2 =
  "No email, no password, no profile — we never learn who you are. Your " +
  "data is end-to-end encrypted before it leaves this device, so even we " +
  "can’t read it. The only thing linking your devices is a code that only " +
  "you hold.";

const CODE_WARNING_LEAD = "Anyone with this code can read and change this data";
const CODE_WARNING_REST = " — treat it like a password. Faves can’t reset it, and can’t tell you who else has it.";

/** Human names for the diet keys, so a difference reads as "Peanuts", not
 *  "contains-peanuts" — same lookup personal-io-ui.js builds for the import
 *  review's identical safety question. Not imported from there: it is a
 *  three-line local helper, not worth a cross-file dependency for. */
const PREF_LABEL = new Map([...DIETARY_PREFS, ...ALLERGEN_PREFS].map((p) => [p.key, p.label]));
const prefList = (keys) => (keys && keys.length ? keys.map((k) => PREF_LABEL.get(k) ?? k).join(", ") : "none");

/** A labelled native radio, styled to match the import review's three-way
 *  diet choice (import-choice/import-radio) — the same question, ADR 0060
 *  says, so it should look like the same question. */
function radio(name, value, labelText, onPick) {
  const input = el("input", { type: "radio", name, value, className: "import-radio" });
  input.addEventListener("change", () => {
    if (input.checked) onPick(value);
  });
  return el("label", { className: "import-choice" }, [input, el("span", { textContent: labelText })]);
}

/** "5 minutes ago" — deliberately a snapshot at render time, not a ticking
 *  clock (personal-io-ui.js's exportedOn() is the same shape for the same
 *  reason): the status line already repaints on every sync event, and a
 *  setInterval that outlives the dialog is a leak this app doesn't have
 *  anywhere else. */
function relTime(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "recently";
  const minutes = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function statusLine(st) {
  if (st.state === SYNCING) return "Syncing…";
  return st.lastSyncedAt ? `Last synced ${relTime(st.lastSyncedAt)}.` : "Not synced yet.";
}

/** The Settings index row's subtitle (ADR 0025) — the answer to "is sync on,
 *  and is it happy?" without opening the panel. */
export function summaryText(st) {
  if (st.state === OFF) return "Off";
  if (st.state === NEEDS_DECISION) return "Needs your answer";
  if (st.state === ERROR) return "Couldn’t sync — tap to retry";
  // Not "tap to retry": no retry helps until this device runs a newer Faves
  // (roadmap 510/090 — the row used to say retry while the panel said update).
  // Or reload it: another tab on this device has already updated (510/110).
  if (st.state === PAUSED) return st.error === RELOAD_NEEDED ? "Paused — reload Faves" : "Paused — update Faves";
  if (st.state === SYNCING) return "Syncing…";
  return st.lastSyncedAt ? `On — synced ${relTime(st.lastSyncedAt)}` : "On — not synced yet";
}

/** Paint `text` as a QR — a near-duplicate of share-ui.js's drawQR(), which
 *  isn't exported and encodes a *URL* by design. This one exists solely so
 *  the sync code (never a URL — see the file header) never has to become
 *  one just to reuse that function. Same visual recipe on purpose: dark on a
 *  white card regardless of theme (a scanner needs contrast, not our palette),
 *  4-module quiet zone, ~300px target. */
function drawSyncQR(canvas, text) {
  const { size, modules } = encodeQR(text);
  const quiet = 4;
  const dim = size + quiet * 2;
  const scale = Math.max(2, Math.floor(300 / dim));
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

/** The code display shared by "just turned on" and "on"'s "Show my code" —
 *  big/monospace/grouped text, a Copy button (clipboard, with the same
 *  reveal-to-copy-by-hand fallback share-ui.js uses when the clipboard API is
 *  blocked), and a QR. The safety warning is repeated every time the code is
 *  actually on screen, not just the first time — the risk of someone reading
 *  it over your shoulder is the same on the fifth reveal as the first. */
function buildCodeBlock(code) {
  const display = el("p", { className: "sync-code-display", textContent: code });
  display.setAttribute("aria-label", `Your sync code: ${code}`);

  const copyBtn = el("button", { type: "button", className: "profile-btn", textContent: "Copy code" });
  const copyStatus = el("p", { className: "settings-data-status", role: "status", "aria-live": "polite" });
  const fallback = el("input", { type: "text", className: "share-link", readOnly: true, hidden: true });
  fallback.setAttribute("aria-label", "Your sync code — select and copy it by hand");
  copyBtn.addEventListener("click", async () => {
    if (await copyText(code)) {
      fallback.hidden = true;
      copyStatus.textContent = "Code copied.";
    } else {
      // Clipboard blocked (or non-HTTPS origin) — reveal the code to copy by
      // hand, the same fallback share-ui.js uses for a share link.
      fallback.hidden = false;
      fallback.value = code;
      fallback.focus();
      fallback.select();
      copyStatus.textContent = "Copy this and keep it somewhere safe.";
    }
  });

  const qrCanvas = el("canvas", { className: "share-qr-canvas" });
  qrCanvas.setAttribute("role", "img");
  qrCanvas.setAttribute(
    "aria-label",
    "QR code of your sync code — scan it with your other device’s camera, or type the code in by hand."
  );
  const qrWrap = el("div", { className: "share-qr" }, [qrCanvas]);
  try {
    drawSyncQR(qrCanvas, code);
  } catch {
    // Sync codes are 14 characters — nowhere near a real QR size limit — so
    // this is not reachable in practice. Kept honest anyway (share-ui.js's
    // sibling catch does the same for a much more plausible overflow).
    qrWrap.replaceChildren(
      el("p", { className: "settings-hint", textContent: "Couldn’t draw a QR code for this — copy the code instead." })
    );
  }

  const warning = el("div", { className: "import-q import-q-safety" }, [
    el("p", { className: "import-diff" }, [
      el("strong", { textContent: CODE_WARNING_LEAD }),
      CODE_WARNING_REST,
    ]),
  ]);

  return el("div", { className: "sync-code-block" }, [
    display,
    el("div", { className: "profile-form-actions" }, [copyBtn]),
    copyStatus,
    fallback,
    qrWrap,
    warning,
  ]);
}

/**
 * "Sync history on this device" (roadmap 510/380): the last syncs that did
 * something, in plain words, behind a button so it costs nothing until asked
 * for, with a Copy for a bug report. Shown in every view that has a history —
 * a person whose sync is off, stuck or asking is exactly the one who wants to
 * see what it last did. The words come from sync-log.js, so the panel and the
 * copied text cannot say different things.
 */
function logControl() {
  const toggle = el("button", {
    type: "button",
    className: "profile-btn",
    textContent: "Show sync history",
    "aria-expanded": "false",
    "aria-controls": "sync-log-list",
  });
  const intro = el("p", {
    className: "settings-hint",
    textContent:
      "The last syncs on this device that changed something, asked something or didn’t finish. " +
      "It stays on this device: it is never synced and never in a backup.",
  });
  const list = el("ol", { className: "sync-log", id: "sync-log-list" });
  const copyBtn = el("button", { type: "button", className: "profile-btn", textContent: "Copy history" });
  const copyStatus = el("p", { className: "settings-data-status", role: "status", "aria-live": "polite" });
  const body = el("div", { className: "sync-log-body", hidden: true }, [intro, list, copyBtn, copyStatus]);
  const wrap = el("div", { className: "sync-divider sync-log-wrap", hidden: true }, [toggle, body]);

  function paint() {
    const entries = sync.history();
    wrap.hidden = entries.length === 0;
    if (body.hidden) return;
    list.replaceChildren(
      ...[...entries].reverse().map((e) => {
        const d = describeEntry(e);
        return el("li", { className: "sync-log-entry" }, [
          el("p", { className: "sync-log-head", textContent: d.head }),
          ...d.lines.map((l) => el("p", { className: "sync-log-line", textContent: l })),
          ...d.ids.map((l) => el("p", { className: "sync-log-ids", textContent: l })),
        ]);
      })
    );
  }
  toggle.addEventListener("click", () => {
    const opening = body.hidden;
    body.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    toggle.textContent = opening ? "Hide sync history" : "Show sync history";
    copyStatus.textContent = "";
    paint();
  });
  copyBtn.addEventListener("click", async () => {
    copyStatus.textContent = (await copyText(syncLogText(sync.history())))
      ? "Sync history copied."
      : "Couldn’t copy — select the list above instead.";
  });
  paint();
  return { node: wrap, refresh: paint };
}

/** Which of the six views is showing. Pure given `(st, local)` — the two
 *  local-only flags are the entirety of this module's own state, everything
 *  else comes from the engine. Idle and syncing deliberately collapse to the
 *  same "on" key (see the file header) so a background sync never rebuilds
 *  the panel out from under a reader. */
export function computeViewKey(st, local) {
  if (st.state === ERROR) return "error";
  if (st.state === PAUSED) return "paused";
  // Two questions, two views: answering the no-base one can be followed at
  // once by the allergen one, and one key for both would leave the first on
  // screen (510/390).
  if (st.state === NEEDS_DECISION) return (st.conflicts || []).some((c) => c.kind === CONFLICT_NO_BASE) ? "no-base" : "decision";
  if (st.state === OFF) return local.joining ? "join" : "off";
  return local.justOn ? "justOn" : "on";
}

export function syncControls() {
  // `enabling` bridges the gap between tapping "Turn on sync" and the code
  // actually existing: sync.js mints the code and writes it to storage
  // *before* attempting a network sync, so the moment status() first reports
  // a code (still inside the synchronous portion of sync.enable() — see the
  // file header), render() promotes this to `justOn`. Without it the reader
  // would see a flash of the generic "on" view (mid first-sync) before the
  // code-reveal screen, which is honest but pointlessly confusing.
  const local = { enabling: false, joining: false, justOn: false };
  let rowEl = null;
  let currentViewKey = null;
  let refs = null;

  const body = el("div", { className: "sync-body" });
  // Outside `body`, which is rebuilt on every change of view: the history
  // stays open, and keeps its place, while sync moves between states.
  const history = logControl();
  const panel = el("div", { className: "settings-panel" }, [body, history.node]);

  function render() {
    const st = sync.status();
    if (local.enabling && st.state !== OFF) {
      local.enabling = false;
      local.justOn = true;
    }
    const viewKey = computeViewKey(st, local);
    if (viewKey !== currentViewKey) {
      // Only steal focus back into this subtree if it was already there —
      // otherwise a background sync completing while the reader is on the
      // home screen would yank them into a Settings dialog they never opened.
      const hadFocus = body.contains(document.activeElement);
      currentViewKey = viewKey;
      const built = buildView(viewKey, st);
      refs = built.refs;
      body.replaceChildren(built.node);
      if (hadFocus) built.focusTarget?.focus();
    } else {
      refs?.patch?.(st);
    }
    if (rowEl) rowEl.textContent = summaryText(st);
    history?.refresh();
  }

  function buildView(viewKey, st) {
    if (viewKey === "off") return buildOff();
    if (viewKey === "join") return buildJoin();
    if (viewKey === "justOn") return buildJustOn(st.code);
    if (viewKey === "decision") return buildDecision(st);
    if (viewKey === "no-base") return buildNoBase(st);
    if (viewKey === "error") return buildError(st);
    if (viewKey === "paused") return buildPaused(st);
    return buildOn(st);
  }

  // --- off -----------------------------------------------------------------
  function buildOff() {
    const intro1 = el("p", { className: "settings-note", textContent: OFF_INTRO_1 });
    const intro2 = el("p", { className: "settings-note", textContent: OFF_INTRO_2 });
    const turnOnBtn = el("button", { type: "button", className: "settings-reset", textContent: "Turn on sync" });
    const hint = el("p", { className: "settings-hint", textContent: "Already have a code from your other device?" });
    const useCodeBtn = el("button", { type: "button", className: "profile-btn", textContent: "Use an existing code" });
    const existing = el("div", { className: "sync-divider" }, [hint, useCodeBtn]);

    // No busy/disabled guard against a double-tap: sync.enable() writes the
    // new code and calls setState() *before* its first `await`, so this
    // button is already gone from the DOM (render() rebuilds into "justOn" or
    // "error") by the time a second tap could physically land.
    turnOnBtn.addEventListener("click", () => {
      local.enabling = true;
      sync.enable();
    });
    useCodeBtn.addEventListener("click", () => {
      local.joining = true;
      render();
    });

    const node = el("div", {}, [intro1, intro2, turnOnBtn, existing]);
    return { node, focusTarget: turnOnBtn, refs: null };
  }

  // --- use an existing code -------------------------------------------------
  const FULL_LENGTH = 14; // 13 random characters + 1 check character (sync-code.js)

  function buildJoin() {
    const intro = el("p", {
      className: "settings-note",
      textContent: "Enter the code shown on your other device’s Sync screen.",
    });
    const label = el("label", { className: "sr-only", htmlFor: "sync-join-code", textContent: "Sync code" });
    const input = el("input", {
      type: "text",
      id: "sync-join-code",
      className: "share-link",
      autocomplete: "off",
      autocapitalize: "characters",
      autocorrect: "off",
      spellcheck: false,
      enterKeyHint: "done",
      placeholder: "K7F29-DMX4Q-RA37B",
    });
    // Never blames the reader: it states a mismatch, not a mistake, and stays
    // silent until a full-length code has actually been typed — a five-
    // character prefix is mid-typing, not wrong.
    const error = el("p", { className: "import-blocked", role: "status", "aria-live": "polite" });
    const joinBtn = el("button", {
      type: "button",
      className: "profile-btn profile-btn-primary",
      textContent: "Join",
      disabled: true,
    });
    const cancelBtn = el("button", { type: "button", className: "profile-btn", textContent: "Cancel" });

    function validate() {
      const ok = isValidSyncCode(input.value);
      joinBtn.disabled = !ok;
      const stripped = input.value.replace(/[\s-]/g, "");
      error.textContent =
        !ok && stripped.length >= FULL_LENGTH
          ? "That doesn’t match a Faves sync code — check it against your other device and try again."
          : "";
    }
    input.addEventListener("input", validate);

    // As with "Turn on sync": the moment sync.join() accepts a well-formed
    // code it leaves the "off" engine state synchronously, before this
    // handler gets control back, so this button is already gone by the time
    // any second tap could land — no busy flag needed.
    joinBtn.addEventListener("click", () => sync.join(input.value));
    cancelBtn.addEventListener("click", () => {
      local.joining = false;
      render();
    });

    const actions = el("div", { className: "profile-form-actions" }, [joinBtn, cancelBtn]);
    const node = el("div", {}, [intro, label, input, error, actions]);
    return { node, focusTarget: input, refs: null };
  }

  // --- just turned on -------------------------------------------------------
  function buildJustOn(code) {
    const heading = el("p", { className: "settings-sub", tabIndex: -1, textContent: "Your sync code" });
    const codeBlock = buildCodeBlock(code);
    const instructions = el("p", {
      className: "settings-hint",
      textContent:
        "On your other device, open Faves, go to Settings → Sync across your devices, choose " +
        "“Use an existing code”, and type this in.",
    });
    const dismissBtn = el("button", {
      type: "button",
      className: "profile-btn profile-btn-primary",
      textContent: "I’ve saved it",
    });
    dismissBtn.addEventListener("click", () => {
      local.justOn = false;
      render();
    });

    const node = el("div", {}, [heading, codeBlock, instructions, dismissBtn]);
    return { node, focusTarget: heading, refs: null };
  }

  /**
   * "Turn off sync on this device", with its inline confirm.
   *
   * Built once and used by the "on", ERROR and paused views. Shared
   * rather than written twice on purpose: the confirmation's wording is a
   * ruling (ADR 0060's addendum — name the *scope*, never a device count),
   * and a rule with two implementations is one this repo has already watched
   * go out of step, each copy locally correct and only one of them updated.
   *
   * Inline confirm, same shape as the People panel's delete confirm and
   * refreshResetSection's refresh confirm — hidden=true then focus(), the
   * order already established across this file's siblings.
   */
  function turnOffControl() {
    const button = el("button", {
      type: "button",
      className: "profile-btn",
      textContent: "Turn off sync on this device",
    });
    const confirmText = el("p", {
      className: "profile-confirm-text",
      textContent:
        "Turn off sync on this device? Only this device stops — your data here stays exactly as it is, " +
        "and any other device using this code carries on syncing with each other.",
    });
    // ADR 0060's addendum: the blob has no device roster, so a device count is
    // an upper bound, not a fact, and the owner ruled the confirmation names
    // the *scope* ("every device signed in with this code"), never a number.
    const confirmGo = el("button", { type: "button", className: "profile-btn profile-btn-primary", textContent: "Turn off" });
    const confirmCancel = el("button", { type: "button", className: "profile-btn", textContent: "Cancel" });
    const confirm = el("div", { className: "profile-confirm", role: "group", hidden: true }, [
      confirmText,
      el("div", { className: "profile-form-actions" }, [confirmGo, confirmCancel]),
    ]);
    confirm.setAttribute("aria-label", "Confirm turn off sync");

    function hideConfirm(refocus) {
      confirm.hidden = true;
      if (refocus) button.focus();
    }
    button.addEventListener("click", () => {
      confirm.hidden = false;
      confirmGo.focus();
    });
    confirmCancel.addEventListener("click", () => hideConfirm(true));
    confirmGo.addEventListener("click", () => {
      local.joining = false;
      local.justOn = false;
      // sync.disable() calls setState(OFF) synchronously, which reenters this
      // module's render() (subscribed below) before this handler returns —
      // render()'s own hadFocus guard is what moves focus off confirmGo, not
      // this handler; there is nothing left to do here after the call.
      sync.disable();
    });

    return { button, confirm, hideConfirm: () => hideConfirm(false) };
  }

  // --- on --------------------------------------------------------------------
  function buildOn(st) {
    const status = el("p", {
      className: "settings-note",
      role: "status",
      "aria-live": "polite",
      tabIndex: -1,
      textContent: statusLine(st),
    });
    const syncBtn = el("button", { type: "button", className: "settings-reset", textContent: "Sync now" });
    syncBtn.setAttribute("aria-disabled", String(st.state === SYNCING));
    const showBtn = el("button", {
      type: "button",
      className: "profile-btn",
      textContent: "Show my code",
      "aria-expanded": "false",
    });
    const off = turnOffControl();
    const actions = el("div", { className: "profile-form-actions" }, [syncBtn, showBtn, off.button]);

    // aria-disabled, deliberately not the `disabled` property: sync.js
    // already de-duplicates concurrent syncNow() calls (an `inFlight`
    // promise), so this is belt-and-braces UI feedback only — and the real
    // `disabled` property would drop focus to <body> the instant someone taps
    // it while it still has focus (the house rule this file's header opens
    // with). aria-disabled never removes focusability, so the guard is
    // purely in the click handler.
    syncBtn.addEventListener("click", () => {
      if (syncBtn.getAttribute("aria-disabled") === "true") return;
      sync.syncNow();
    });

    const codeReveal = el("div", { hidden: true });
    function toggleReveal() {
      const opening = codeReveal.hidden;
      if (opening) codeReveal.replaceChildren(buildCodeBlock(st.code));
      else codeReveal.replaceChildren();
      codeReveal.hidden = !opening;
      showBtn.setAttribute("aria-expanded", String(opening));
      showBtn.textContent = opening ? "Hide my code" : "Show my code";
    }
    showBtn.addEventListener("click", toggleReveal);

    const node = el("div", {}, [status, actions, codeReveal, off.confirm]);
    return {
      node,
      focusTarget: status,
      refs: {
        patch: (st2) => {
          status.textContent = statusLine(st2);
          syncBtn.setAttribute("aria-disabled", String(st2.state === SYNCING));
        },
        hideConfirm: off.hideConfirm,
      },
    };
  }

  // --- no last agreement (roadmap 510/390) --------------------------------------
  //
  // The engine found this device holding things sync does not, with no last
  // agreement to tell an addition here from a removal elsewhere — the merge
  // that once added them silently (510/320's union). Nothing syncs, in either
  // direction, until this is answered: leaving the panel is not an answer.
  //
  // NOTHING IS PRE-SELECTED, as with the allergen question: each answer costs
  // something the other does not (one drops this device's extras, the other
  // can bring back something removed elsewhere), so a default would be a guess
  // made on the person's behalf. Turning sync off stays reachable (ADR 0118).
  function buildNoBase(st) {
    const c = (st.conflicts || []).find((x) => x.kind === CONFLICT_NO_BASE) || { people: [] };
    const heading = el("p", {
      className: "settings-sub",
      tabIndex: -1,
      textContent: "This device has favourites sync doesn’t",
    });
    const explain = el("p", {
      className: "settings-note",
      textContent:
        "This device has no record of when it last matched your other devices, so Faves can’t tell whether " +
        "these were added here or removed on another device. Nothing syncs, either way, until you choose.",
    });
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const blocks = c.people.map((p) => {
      const parts = [];
      if (p.favourites) parts.push(plural(p.favourites, "favourite", "favourites"));
      if (p.ratings) parts.push(plural(p.ratings, "rating", "ratings"));
      if (p.notes) parts.push(plural(p.notes, "note", "notes"));
      const more = p.favourites - (p.sample?.length || 0);
      return el("div", { className: "import-q" }, [
        el("p", { className: "import-entry-head", textContent: `${p.profileName || "This profile"}: ${parts.join(", ")} only on this device` }),
        ...(p.sample?.length
          ? [el("p", { className: "import-diff", textContent: `Including ${p.sample.join(", ")}${more > 0 ? ` and ${more} more` : ""}.` })]
          : []),
      ]);
    });

    let choice = null;
    const resolveBtn = el("button", {
      type: "button",
      className: "profile-btn profile-btn-primary",
      textContent: "Use this answer",
      disabled: true,
    });
    const pick = (v) => {
      choice = v;
      resolveBtn.disabled = false;
    };
    const name = "sync-no-base-choice";
    const choices = el("fieldset", { className: "import-q" }, [
      el("legend", { textContent: "What should sync do with them?" }),
      radio(name, KEEP_SYNCED, "Keep what sync has — remove them from this device", pick),
      radio(name, ADD_EXTRAS, "Add them to all your devices", pick),
    ]);
    resolveBtn.addEventListener("click", () => {
      if (!choice) return;
      sync.resolve({ noBase: choice });
    });
    const off = turnOffControl();
    const node = el("div", {}, [
      heading,
      explain,
      ...blocks,
      choices,
      el("div", { className: "profile-form-actions" }, [resolveBtn, off.button]),
      off.confirm,
    ]);
    return { node, focusTarget: heading, refs: { hideConfirm: off.hideConfirm } };
  }

  // --- needs a decision (ADR 0060) --------------------------------------------
  function buildDecision(st) {
    const conflicts = (st.conflicts || []).filter((c) => c.kind === "diet");
    const heading = el("p", {
      className: "settings-sub",
      tabIndex: -1,
      textContent: "Your devices disagree on allergen settings",
    });
    // Says what is TRUE while the question is open. The merged union ADR 0060
    // describes exists only in the engine's memory until the answer is
    // written; nothing on this device renders it. Until 2026-08-17 this line
    // promised warnings for "every allergen flagged on either device", and a
    // reader whose other device had flagged nuts was under-warned by exactly
    // the sentence meant to reassure them (cold review, 2026-08-17).
    const explain = el("p", {
      className: "settings-note",
      textContent:
        "Until you choose, this device keeps warning about the allergens flagged here. " +
        "Nothing from the other device is applied — in either direction — before you decide.",
    });
    const blocks = conflicts.map((c) =>
      el("div", { className: "import-q import-q-safety" }, [
        el("p", { className: "import-entry-head", textContent: `${c.profileName || "This profile"}’s food preferences differ` }),
        el("p", {
          className: "import-diff",
          textContent: `On this device — needs: ${prefList(c.mine?.dietary)}; allergens flagged: ${prefList(c.mine?.avoid)}`,
        }),
        el("p", {
          className: "import-diff",
          textContent: `On your other device — needs: ${prefList(c.theirs?.dietary)}; allergens flagged: ${prefList(c.theirs?.avoid)}`,
        }),
      ])
    );

    let choice = null;
    const resolveBtn = el("button", {
      type: "button",
      className: "profile-btn profile-btn-primary",
      textContent: "Use this answer",
      disabled: true,
    });
    const pick = (v) => {
      choice = v;
      resolveBtn.disabled = false;
    };
    // Deliberately nothing checked by default — the same rule the import
    // review holds for this exact question (ADR 0030): a pre-selected answer
    // to an allergen question is a guess wearing a decision's clothes.
    const name = "sync-diet-choice";
    const choices = el("fieldset", { className: "import-q" }, [
      el("legend", { textContent: "Which do you want to use?" }),
      radio(name, "keep", "Keep what’s on this device", pick),
      radio(name, "incoming", "Use what’s on your other device", pick),
      radio(name, "combine", "Flag both — keep every allergen from either", pick),
    ]);

    resolveBtn.addEventListener("click", () => {
      if (!choice) return;
      sync.resolve({ diet: choice });
    });

    const node = el("div", {}, [heading, explain, ...blocks, choices, resolveBtn]);
    return { node, focusTarget: heading, refs: null };
  }

  // --- error -----------------------------------------------------------------
  //
  // THIS VIEW HAS TWO WAYS OUT, AND UNTIL 2026-09-20 IT HAD ONE (ADR 0118).
  // It offered Retry and nothing else, so a reader whose sync was broken for a
  // reason retrying cannot fix — a code that no longer matches the data on the
  // server, a Worker that has gone away, a device wedged offline — had no
  // route back to the "on" view's controls, because the panel only ever shows
  // ONE view and ERROR outranks them all (computeViewKey). The one verb that
  // ends the problem, `sync.disable()`, was reachable from every state except
  // the one that needed it. Same control and same confirmation as the "on"
  // view, deliberately: turning sync off does not mean something different
  // because sync happens to be unhappy.
  function buildError(st) {
    const message = el("p", {
      className: "settings-note",
      role: "status",
      "aria-live": "polite",
      tabIndex: -1,
      // The engine writes user-facing prose (sync.js's own setState() calls) —
      // shown verbatim, never re-worded here.
      textContent: st.error || "Something went wrong with sync.",
    });
    const retryBtn = el("button", { type: "button", className: "profile-btn profile-btn-primary", textContent: "Retry" });
    retryBtn.addEventListener("click", () => sync.syncNow());
    const off = turnOffControl();
    // Says the thing a person in this state is actually afraid of. sync.js's
    // own error prose already promises the data is safe on this device; this
    // says the same of the way *out*, because "turn it off" is exactly the
    // button someone worried about losing their favourites will not press
    // without being told.
    const offHint = el("p", {
      className: "settings-hint",
      textContent:
        "Retrying won’t always help — if sync can’t be fixed from here, you can turn it off. " +
        "Nothing on this device is deleted.",
    });

    const node = el("div", {}, [
      message,
      el("div", { className: "profile-form-actions" }, [retryBtn, off.button]),
      offHint,
      off.confirm,
    ]);
    return {
      node,
      focusTarget: message,
      refs: {
        patch: (st2) => { message.textContent = st2.error || "Something went wrong with sync."; },
        hideConfirm: off.hideConfirm,
      },
    };
  }

  // --- paused (roadmap 510/090) ---------------------------------------------
  //
  // Another device has changed the shape of a store this one reads (ADR 0146
  // §3). Until 2026-09-30 this reused the error view, so it offered Retry — a
  // button that cannot help, because the only fix is a newer Faves on THIS
  // device. No Retry here: the engine already checks again on every
  // foreground, and an updated build simply passes. Turning sync off stays,
  // for the same reason the error view has it (ADR 0118).
  function buildPaused(st) {
    const message = el("p", {
      className: "settings-note",
      role: "status",
      "aria-live": "polite",
      tabIndex: -1,
      textContent: st.error,
    });
    const hint = el("p", {
      className: "settings-hint",
      textContent:
        st.error === RELOAD_NEEDED
          ? "Tap Reload at the bottom of the screen, and sync carries on by itself."
          : "Faves looks for a newer version whenever you come back to it. When one is ready, a Refresh " +
            "button appears at the bottom of the screen — tap it, and sync carries on by itself.",
    });
    const off = turnOffControl();
    const node = el("div", {}, [
      message,
      hint,
      el("div", { className: "profile-form-actions" }, [off.button]),
      off.confirm,
    ]);
    return {
      node,
      focusTarget: message,
      refs: {
        patch: (st2) => { if (st2.error) message.textContent = st2.error; },
        hideConfirm: off.hideConfirm,
      },
    };
  }

  // Page-lifetime subscription — the sheet is built lazily but stays in the
  // DOM once built (initSettingsUI's own comment says the same of itself), so
  // this never needs to unsubscribe.
  sync.subscribe(render);
  render();

  return {
    panel,
    /** For the TOPICS index row (ADR 0025): current state, ignoring the diet
     *  settings `s` argument every other topic's summary takes — sync has its
     *  own source of truth. */
    summary: () => summaryText(sync.status()),
    /** Wire the index row's value span so it live-updates on every sync event,
     *  not just when settings-ui's own sync() cycle happens to run. */
    bindRow(valueEl) {
      rowEl = valueEl;
      if (rowEl) rowEl.textContent = summaryText(sync.status());
    },
    /** Called when the panel is left (back to the index, or the whole sheet
     *  closes) — resets the "use an existing code" sub-view so reopening
     *  starts clean, and closes any open turn-off confirm. Mirrors
     *  dataSection()/refreshResetSection()'s own close(). */
    close() {
      local.joining = false;
      refs?.hideConfirm?.();
    },
  };
}
