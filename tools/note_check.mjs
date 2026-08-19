#!/usr/bin/env node
// The seventh of the headless-browser family (ADR on the order-line note).
// Theme 14c puts a free-text note on an order line — "no tomato" — and three
// things about it are only observable in a real browser at 390 px:
//
//   1. The note is part of LINE IDENTITY, so the sheet can show "Eggs on Toast"
//      and "Eggs on Toast — no tomato" side by side. Two adjacent ± controls
//      differing only by a note are indistinguishable to a screen reader, and
//      were operating the WRONG LINE until the stepper was made note-aware.
//      A unit test cannot see which button the DOM wired to which line.
//   2. Clearing a note MERGES its line into the plain one. That is a mutation
//      of the store driven by a keystroke and a blur, through the real UI.
//   3. The note is the first thing on this screen that is free text a person
//      typed. It is rendered with textContent, and the check crafts an
//      `<img onerror>` note and asserts it comes back as characters with zero
//      <img> elements in the sheet.
//
// What a green run here CANNOT tell you, and nothing in this file pretends
// otherwise: whether the extra ~44px row on every line makes a twelve-line
// order feel cluttered on a real phone; whether iOS Safari zooms on focus
// (the input is 16px specifically so it does not, untestable here); how
// VoiceOver actually reads "Eggs on Toast, Note: no tomato, $20"; and whether
// a note asking for something the shop will not do is a problem at all — no
// browser can check that. Dark-mode contrast is reasoned, not measured.
//
// Run it after touching cart.js, cart-ui.js, share-codec.js, or the order
// sheet's markup or CSS.
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cdp, Report, createDriver, launchChrome, need, startServer, stopChrome, until } from "./lib/browser.mjs";

const SITE = new URL("../site", import.meta.url).pathname;

const seed = (lines) => `localStorage.setItem("faves.order.v1", ${JSON.stringify(JSON.stringify(lines))}); true`;

const L = (over = {}) => ({
  venueId: "fixture-venue", venueName: "A Cafe", currency: "NZD", phone: null,
  name: "Eggs on Toast", price: 20, options: [], qty: 1, collected: false, ...over,
});

const snap = `(() => {
  const sheet = document.querySelector('dialog.order-sheet[aria-labelledby="order-title"]');
  const $ = (sel) => (sheet ? sheet.querySelectorAll(sel) : []);
  const lines = [...$(".order-line")];
  const contrast = (fg, bg) => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const a = lum(fg), b2 = lum(bg);
    return Math.round(((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)) * 100) / 100;
  };
  const noteEl = $(".order-line-note")[0] || null;
  const btn = $(".order-note-btn")[0] || null;
  const input = $(".order-note-input")[0] || null;
  const label = input ? document.querySelector('label[for="' + input.id + '"]') : null;
  const save = $(".order-note-save")[0] || null;
  const box = (e) => (e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null);
  return {
    open: !!(sheet && sheet.open),
    lineCount: lines.length,
    lineTexts: lines.map((l) => l.textContent.replace(/\\s+/g, " ").trim()),
    noteText: noteEl ? noteEl.textContent.replace(/\\s+/g, " ").trim() : null,
    noteContrast: noteEl ? contrast(getComputedStyle(noteEl).color, getComputedStyle(document.body).backgroundColor) : null,
    btnLabels: [...$(".order-note-btn")].map((b) => [b.textContent, b.getAttribute("aria-label")]),
    btnBox: box(btn),
    inputBox: box(input),
    saveBox: box(save),
    inputMax: input ? input.maxLength : null,
    inputFont: input ? getComputedStyle(input).fontSize : null,
    labelText: label ? label.textContent : null,
    helpText: ($(".order-note-help")[0] || {}).textContent || null,
    describedBy: input ? input.getAttribute("aria-describedby") : null,
    focused: document.activeElement ? (document.activeElement.className || document.activeElement.tagName) : null,
    imgsInSheet: sheet ? sheet.querySelectorAll("img").length : -1,
    xssRan: window.__xss === 1,
    hOverflow: document.documentElement.scrollWidth > window.innerWidth,
    stored: JSON.parse(localStorage.getItem("faves.order.v1") || "[]").map((l) => [l.name, l.qty, l.note ?? null, l.collected]),
    storedHasNoteField: JSON.parse(localStorage.getItem("faves.order.v1") || "[]").map((l) => "note" in l),
  };
})()`;

const run = async () => {
  const report = new Report(false);
  const { server, port } = await startServer(0, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-note-check-"));
  let chrome = null, cdp = null;
  try {
    const url = `http://127.0.0.1:${port}/`;
    chrome = await launchChrome({ profileDir, headed: false });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }, sessionId);
    const d = createDriver(cdp, sessionId, () => {});

    const errors = [];
    cdp.on("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") errors.push(p.args.map((a) => a.value || a.description).join(" "));
    });

    const load = async (lines) => {
      await cdp.send("Page.navigate", { url }, sessionId);
      await until(async () => await d.evalPage("!!document.querySelector('.order-fab')"), { label: "the order UI" });
      await d.evalPage(seed(lines));
      await cdp.send("Page.navigate", { url }, sessionId);
      await until(async () => await d.evalPage("!!document.querySelector('.order-fab') && !document.querySelector('.order-fab').hidden"), { label: "the order button" });
      await d.click(".order-fab");
      await until(async () => (await d.evalPage(snap)).open, { label: "the order sheet" });
    };

    // ---- 1. the affordance ------------------------------------------------
    await load([L({ qty: 2 })]);
    let s = await d.evalPage(snap);
    report.check("every order line offers a note, named for its dish",
      s.btnLabels.length === 1 && s.btnLabels[0][0] === "Add a note" && s.btnLabels[0][1] === "Add a note for Eggs on Toast",
      JSON.stringify(s.btnLabels));
    report.check("the control is a full 44 px target at 390 px",
      s.btnBox.h >= 44, JSON.stringify(s.btnBox));
    report.check("the sheet does not scroll sideways at 390 px", !s.hOverflow, `hOverflow=${s.hOverflow}`);

    // ---- 2. the editor ----------------------------------------------------
    await d.click('dialog[aria-labelledby="order-title"] .order-note-btn');
    s = await d.evalPage(snap);
    report.check("it opens a real labelled field, the label naming the dish",
      s.labelText === "Note for Eggs on Toast", String(s.labelText));
    report.check("the field is 44 px tall and 16 px type (no iOS zoom-on-focus)",
      s.inputBox.h >= 44 && parseFloat(s.inputFont) >= 16, `${JSON.stringify(s.inputBox)} ${s.inputFont}`);
    report.check("the Save control is a 44 px target too", s.saveBox.h >= 44, JSON.stringify(s.saveBox));
    report.check("the cap is capped AND stated where the reader can see it",
      s.inputMax === 80 && /80 characters/.test(s.helpText || ""), `maxlength=${s.inputMax} · ${s.helpText}`);
    report.check("the help text steers to the counter, not to allergies",
      /No tomato/.test(s.helpText) && !/allerg/i.test(s.helpText), String(s.helpText));
    report.check("the field is described by that help text and takes focus",
      s.describedBy && s.focused === "order-note-input", `${s.describedBy} · focus=${s.focused}`);

    // ---- 3. saving --------------------------------------------------------
    await d.evalPage(`${need('dialog[aria-labelledby="order-title"] .order-note-input')}.value = "  no   tomato "; true`);
    await d.click('dialog[aria-labelledby="order-title"] .order-note-save');
    s = await d.evalPage(snap);
    report.check("the note is stored normalised, on the line, and nowhere else",
      JSON.stringify(s.stored) === JSON.stringify([["Eggs on Toast", 2, "no tomato", false]]), JSON.stringify(s.stored));
    report.check("it renders under the dish name, announced as a note",
      s.noteText === "✎ Note: no tomato", String(s.noteText));
    report.check("…at AA contrast or better against the sheet",
      s.noteContrast >= 4.5, `${s.noteContrast}:1`);
    report.check("the control now reads Edit note, and keeps keyboard focus",
      s.btnLabels[0][0] === "Edit note" && s.focused === "order-note-btn",
      `${JSON.stringify(s.btnLabels)} focus=${s.focused}`);

    // ---- 4. clearing merges (the case a naive build gets wrong) -----------
    await load([L({ qty: 1 }), L({ qty: 2, note: "no tomato" })]);
    s = await d.evalPage(snap);
    report.check("a plain line and a noted line are two lines on screen",
      s.lineCount === 2, `${s.lineCount} lines`);
    await d.click(".order-note-btn", "Edit note");
    await d.evalPage(`${need('dialog[aria-labelledby="order-title"] .order-note-input')}.value = ""; true`);
    await d.click('dialog[aria-labelledby="order-title"] .order-note-save');
    s = await d.evalPage(snap);
    report.check("clearing the note merges into the plain line, quantities summed",
      s.lineCount === 1 && JSON.stringify(s.stored) === JSON.stringify([["Eggs on Toast", 3, null, false]]),
      `${s.lineCount} line(s) · ${JSON.stringify(s.stored)}`);
    report.check("…and the cleared line carries no `note` field at all",
      JSON.stringify(s.storedHasNoteField) === "[false]", JSON.stringify(s.storedHasNoteField));

    // ---- 5. collect mode reads the note out ------------------------------
    await load([L({ qty: 1, note: "no tomato" })]);
    await d.click('dialog[aria-labelledby="order-title"] .order-collect-toggle');
    s = await d.evalPage(snap);
    report.check("collect mode puts the note IN the line you read at the counter",
      s.lineTexts.some((t) => t.includes("1× Eggs on Toast — no tomato")), JSON.stringify(s.lineTexts));

    // ---- 6. a crafted note is text, never markup -------------------------
    await load([L({ qty: 1, note: "<img src=x onerror=window.__xss=1>" })]);
    s = await d.evalPage(snap);
    report.check("a note off a crafted link is shown as characters, not parsed",
      s.imgsInSheet === 0 && !s.xssRan && s.noteText.includes("<img src=x onerror=window.__xss=1>"),
      `${s.imgsInSheet} img(s) · xssRan=${s.xssRan} · ${s.noteText}`);

    report.check("no console errors anywhere in the run", errors.length === 0, errors.join(" | ") || "none");
    return report.summary(SITE);
  } finally {
    if (cdp) cdp.close();
    if (chrome) await stopChrome(chrome.proc);
    server.close();
  }
};

run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });
