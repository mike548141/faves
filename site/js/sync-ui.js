// The Settings topic for continual cross-device sync (ROADMAP Theme 9 v2,
// ADR 0017, ADR 0060). This is the UI half only — every decision about
// *whether* something changed lives in sync.js/sync-merge.js; this module
// just renders whatever `sync.status()` says and forwards taps to the five
// verbs sync.js exposes (enable/join/resolve/disable/syncNow).
//
// A STATE MACHINE OF VIEWS, NOT A FLAT PANEL. The six views the brief names
// (off, just-turned-on, on, use-an-existing-code, needs-decision, error) are
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

import { sync, OFF, SYNCING, ERROR, NEEDS_DECISION } from "./sync.js";
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
function summaryText(st) {
  if (st.state === OFF) return "Off";
  if (st.state === NEEDS_DECISION) return "Needs your answer";
  if (st.state === ERROR) return "Couldn’t sync — tap to retry";
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

/** Which of the six views is showing. Pure given `(st, local)` — the two
 *  local-only flags are the entirety of this module's own state, everything
 *  else comes from the engine. Idle and syncing deliberately collapse to the
 *  same "on" key (see the file header) so a background sync never rebuilds
 *  the panel out from under a reader. */
function computeViewKey(st, local) {
  if (st.state === ERROR) return "error";
  if (st.state === NEEDS_DECISION) return "decision";
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
  const panel = el("div", { className: "settings-panel" }, [body]);

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
  }

  function buildView(viewKey, st) {
    if (viewKey === "off") return buildOff();
    if (viewKey === "join") return buildJoin();
    if (viewKey === "justOn") return buildJustOn(st.code);
    if (viewKey === "decision") return buildDecision(st);
    if (viewKey === "error") return buildError(st);
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
    const offBtn = el("button", {
      type: "button",
      className: "profile-btn",
      textContent: "Turn off sync on this device",
    });
    const actions = el("div", { className: "profile-form-actions" }, [syncBtn, showBtn, offBtn]);

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

    // Inline confirm, same shape as the People panel's delete confirm and
    // refreshResetSection's refresh confirm — hidden=true then focus(), the
    // order already established across this file's siblings.
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
      if (refocus) offBtn.focus();
    }
    offBtn.addEventListener("click", () => {
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

    const node = el("div", {}, [status, actions, codeReveal, confirm]);
    return {
      node,
      focusTarget: status,
      refs: {
        patch: (st2) => {
          status.textContent = statusLine(st2);
          syncBtn.setAttribute("aria-disabled", String(st2.state === SYNCING));
        },
        hideConfirm: () => hideConfirm(false),
      },
    };
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

    const node = el("div", {}, [message, retryBtn]);
    return {
      node,
      focusTarget: message,
      refs: { patch: (st2) => { message.textContent = st2.error || "Something went wrong with sync."; } },
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
