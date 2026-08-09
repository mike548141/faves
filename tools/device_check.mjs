#!/usr/bin/env node
// Scripted device check — the LIVE SAFETY re-apply, driven through a real
// browser instead of a manual phone test.
//
//     node tools/device_check.mjs            # headless, exit 0 = pass
//     node tools/device_check.mjs --help
//
// WHY THIS EXISTS. Settings is reachable from a restaurant menu, so a viewer can
// flag an allergen — or hand the phone to someone else — while a menu is on
// screen. menu.js must then re-apply the warning treatment live, off the same
// render path as the first paint (dietary.js). That is safety-critical and was
// only ever proven by unit tests plus an owner eyeball; the owner ruled
// (2026-07-24) that the confirmation be scripted and re-runnable rather than a
// manual phone test. This drives the real Settings UI with real mouse input and
// asserts on the real DOM:
//
//   a) flip an allergen preference → every matching dish lights up, with no
//      navigation or reload;
//   b) switch profile → the safety treatment and the hearts/ratings re-apply to
//      the new person, and switching back restores the first person's.
//
// NOT PART OF THE SHIPPED SITE. Nothing here runs in a browser from site/; it is
// dev tooling, like tools/serve.py, and touches no shipped artefact. Node is a
// measuring instrument here, never a build or runtime dependency (ADR 0001), so
// it speaks the Chrome DevTools Protocol over the platform's own WebSocket — no
// npm packages, no puppeteer, nothing to install.
//
// THE FRESH PROFILE IS LOAD-BEARING. The service worker will happily serve the
// previous run's assets, and a hard reload does not bust it — so every run gets
// a brand new --user-data-dir under the OS temp dir (no SW registration, no
// localStorage, no cache) and deletes it afterwards. That is the same trick the
// owner would use by hand; automating it is most of the value here.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// A venue whose menu carries plenty of peanut-tagged dishes, so the assertion
// has real signal rather than resting on one row. Override with --id.
const DEFAULT_VENUE = "rs-satay-noodle-house";
const ALLERGEN = { key: "contains-peanuts", chip: "Peanuts" };
const SEED_RATING = 4;
// Neutral display names — this repo is publication-bound, so the fixture never
// carries a real person's name (CLAUDE.md, no personal data).
const GUEST_NAME = "Guest";

const CHROME =
  process.env.FAVES_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const HELP = `Faves device check — verify the live allergen re-highlight in a real browser.

  node tools/device_check.mjs [options]

Serves site/ locally, launches Google Chrome headless against a throwaway
profile, then drives the real Settings UI: flips an allergen preference on a
restaurant menu and switches profile, asserting the safety treatment and the
hearts/ratings re-apply live — with no navigation or reload.

Options:
  --id <venue-id>   Restaurant to test (default: ${DEFAULT_VENUE}).
  --port <n>        Port for the local static server (default: an unused one).
  --headed          Show the browser window (for watching it work).
  --keep-profile    Leave the temporary Chrome profile behind, and say where.
  --verbose         Print every step, not just the assertions.
  -h, --help        This message.

Exit status: 0 all assertions passed; 1 an assertion failed; 2 the harness
itself could not run (no Chrome, port in use, page never rendered).

Requires Google Chrome (set FAVES_CHROME to point elsewhere). No npm install —
the site ships build-less and this tool adds no dependency to it (ADR 0001).`;

// --- Arguments ----------------------------------------------------------

function parseArgs(argv) {
  const opts = { id: DEFAULT_VENUE, port: 0, headed: false, keepProfile: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--port") opts.port = Number(argv[++i]);
    else if (a === "--headed") opts.headed = true;
    else if (a === "--keep-profile") opts.keepProfile = true;
    else if (a === "--verbose") opts.verbose = true;
    else throw new Error(`unknown option: ${a} (try --help)`);
  }
  if (!opts.id) throw new Error("--id needs a venue id");
  if (!Number.isInteger(opts.port) || opts.port < 0) throw new Error("--port needs a number");
  return opts;
}

// --- A static server for site/ -----------------------------------------
// Same shape as tools/serve.py (no-store, correct module MIME types) but
// in-process, so the harness owns its lifetime and can pick a free port.

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function startServer(port) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(SITE, path));
    if (!file.startsWith(SITE)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    if (path.endsWith("/")) file = join(file, "index.html");
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": MIME[extname(file)] || "application/octet-stream",
        // No caching, so a run always measures the working tree.
        "Cache-Control": "no-store, must-revalidate",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
    }
  });
  return new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(port, "127.0.0.1", () => res({ server, port: server.address().port }));
  });
}

// --- Chrome DevTools Protocol over a raw WebSocket ----------------------
// Node 24 ships a global WebSocket, which is the whole client: one socket to the
// browser, flat sessions (`sessionId`) for the page target.

class Cdp {
  #ws;
  #next = 1;
  #pending = new Map();
  #handlers = new Map();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener("message", (ev) => this.#receive(String(ev.data)));
    ws.addEventListener("close", () => {
      for (const { reject } of this.#pending.values()) {
        reject(new Error("devtools connection closed"));
      }
      this.#pending.clear();
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error(`cannot reach devtools at ${url}`)), {
        once: true,
      });
    });
    return new Cdp(ws);
  }

  #receive(raw) {
    const msg = JSON.parse(raw);
    if (msg.id != null) {
      const entry = this.#pending.get(msg.id);
      if (!entry) return;
      this.#pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.error) entry.reject(new Error(`${entry.method}: ${msg.error.message}`));
      else entry.resolve(msg.result);
      return;
    }
    for (const fn of this.#handlers.get(msg.method) ?? []) fn(msg.params, msg.sessionId);
  }

  send(method, params = {}, sessionId) {
    const id = this.#next++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method} timed out after 30s`));
      }, 30_000);
      this.#pending.set(id, { resolve, reject, timer, method });
      this.#ws.send(JSON.stringify(payload));
    });
  }

  on(method, fn) {
    if (!this.#handlers.has(method)) this.#handlers.set(method, []);
    this.#handlers.get(method).push(fn);
  }

  close() {
    try {
      this.#ws.close();
    } catch {
      /* already gone — nothing to close */
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll `fn` until it returns truthy, or give up. Returns the truthy value. */
async function until(fn, { label, timeout = 15_000, step = 100 }) {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    last = await fn();
    if (last) return last;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(step);
  }
}

// --- Chrome ------------------------------------------------------------

async function launchChrome({ profileDir, headed }) {
  if (!existsSync(CHROME)) {
    throw new Error(`Google Chrome not found at ${CHROME} (set FAVES_CHROME)`);
  }
  const args = [
    // Port 0 → Chrome picks a free one and writes it to DevToolsActivePort, so
    // two runs (or a stray browser) can never collide on a fixed port.
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--window-size=390,844",
    "about:blank",
  ];
  if (!headed) args.unshift("--headless=new", "--disable-gpu");
  const proc = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d) => {
    stderr += d;
  });
  proc.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`chrome exited (${code})\n${stderr.slice(-2000)}\n`);
    }
  });

  const portFile = join(profileDir, "DevToolsActivePort");
  const contents = await until(
    async () => {
      try {
        const text = await readFile(portFile, "utf8");
        return text.includes("\n") ? text : null;
      } catch {
        return null;
      }
    },
    { label: "Chrome's DevToolsActivePort", timeout: 20_000 }
  );
  const [port, path] = contents.trim().split("\n");
  return { proc, wsUrl: `ws://127.0.0.1:${port}${path}` };
}

async function stopChrome(proc) {
  if (!proc || proc.exitCode != null) return;
  proc.kill("SIGTERM");
  const gone = await Promise.race([
    new Promise((r) => proc.once("exit", () => r(true))),
    sleep(3000).then(() => false),
  ]);
  if (!gone) proc.kill("SIGKILL");
}

// --- The page under test ------------------------------------------------

/** Everything one assertion needs, read off the live DOM in a single hop. */
const snapshotExpr = (dishName) => `(() => {
  const dishes = [...document.querySelectorAll("li.dish")];
  const nameOf = (d) => d.dataset.name;
  const tags = (d) => (d.dataset.tags || "").split(" ");
  const target = dishes.find((d) => d.dataset.name === ${JSON.stringify(dishName.toLowerCase())});
  const heart = target ? target.querySelector(".dish-actions .heart") : null;
  const slider = target ? target.querySelector(".dish-rating [role=slider]") : null;
  return {
    dishes: dishes.length,
    allergen: dishes.filter((d) => tags(d).includes(${JSON.stringify(ALLERGEN.key)})).map(nameOf),
    flagged: dishes.filter((d) => d.classList.contains("dish-flagged")).map(nameOf),
    flaggedChips: document.querySelectorAll(".tag-allergen.is-flagged").length,
    heart: heart ? heart.getAttribute("aria-pressed") : null,
    rating: slider ? slider.getAttribute("aria-valuenow") : null,
    profile: (document.querySelector(".profile-caption-name") || {}).textContent || null,
    sentinel: window.__favesDeviceCheck || null,
    settingsOpen: !!document.querySelector("dialog.settings-sheet[open]"),
  };
})()`;

/** localStorage the page must already hold when its modules boot: one hearted +
 *  rated dish for the first profile, so a profile switch has something visible
 *  to swap. Written for profile "default" — profiles.js mints that id first. */
function seedExpr(venueId, venueName, dishName) {
  const entry = { type: "dish", venueId, venueName, name: dishName, isRecipe: false };
  const favourites = JSON.stringify([entry]);
  const ratings = JSON.stringify({ [`d:${venueId} ${dishName}`]: SEED_RATING });
  return `try {
  localStorage.setItem("faves.p.default.favourites.v1", ${JSON.stringify(favourites)});
  localStorage.setItem("faves.p.default.ratings.v1", ${JSON.stringify(ratings)});
} catch (e) { /* opaque origin (about:blank) — the real page seeds on load */ }`;
}

// --- Runner -------------------------------------------------------------

class Report {
  #rows = [];
  #verbose;
  constructor(verbose) {
    this.#verbose = verbose;
  }
  step(msg) {
    if (this.#verbose) console.log(`   · ${msg}`);
  }
  check(name, ok, detail = "") {
    this.#rows.push({ name, ok });
    const mark = ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${name}${detail ? `\n        ${detail}` : ""}`);
    return ok;
  }
  get failed() {
    return this.#rows.filter((r) => !r.ok).length;
  }
  get passed() {
    return this.#rows.filter((r) => r.ok).length;
  }
}

const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function run(opts) {
  const report = new Report(opts.verbose);

  // Which dish carries the seeded heart + rating: the first one tagged with the
  // allergen under test, so one dish exercises both halves of the check.
  const venuePath = join(SITE, "data", "restaurants", `${opts.id}.json`);
  const venue = JSON.parse(await readFile(venuePath, "utf8"));
  const items = (venue.menu || []).flatMap((s) => s.items || []);
  const seedDish = items.find((i) => (i.tags || []).includes(ALLERGEN.key));
  if (!seedDish) {
    throw new Error(`${opts.id} has no ${ALLERGEN.key} dish — pick another --id`);
  }

  const { server, port } = await startServer(opts.port);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-device-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(opts.id)}`;
    console.log(`Faves device check — live allergen re-highlight`);
    console.log(`  venue    ${venue.name} (${opts.id})`);
    console.log(`  page     ${url}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    report.step("connected to Chrome");

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    // Every navigation the page makes on its own is a failure of the thing under
    // test ("live, without a reload"), so count them rather than trust a sentinel
    // alone. The first load is expected; anything after it is not.
    let navigations = 0;
    cdp.on("Page.frameNavigated", (p) => {
      if (!p.frame.parentId) navigations++;
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // Mobile width (the design target) without touch emulation: the behaviour
    // under test is layout-independent, and mouse input is the deterministic way
    // to drive real controls.
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: seedExpr(opts.id, venue.name, seedDish.name) },
      sessionId
    );

    const evalPage = async (expression) => {
      const r = await cdp.send(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise: true },
        sessionId
      );
      if (r.exceptionDetails) {
        const e = r.exceptionDetails;
        throw new Error(`page eval failed: ${e.exception?.description || e.text}`);
      }
      return r.result.value;
    };

    // Two frames, so a render triggered by the click has painted before we look.
    const settle = () =>
      evalPage("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");

    const click = async (selector, text = null) => {
      const box = await evalPage(`(() => {
        const els = [...document.querySelectorAll(${JSON.stringify(selector)})];
        const want = ${JSON.stringify(text)};
        const el = want == null ? els[0] : els.find((e) => e.textContent.includes(want));
        if (!el) return null;
        el.scrollIntoView({ block: "center", inline: "center" });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })()`);
      const what = `${selector}${text ? ` containing "${text}"` : ""}`;
      if (!box) throw new Error(`no element matching ${what}`);
      if (box.w < 1 || box.h < 1) throw new Error(`${what} has no clickable box`);
      const base = { x: box.x, y: box.y, button: "left", clickCount: 1 };
      await cdp.send("Input.dispatchMouseEvent", { ...base, type: "mouseMoved" }, sessionId);
      await cdp.send(
        "Input.dispatchMouseEvent",
        { ...base, type: "mousePressed", buttons: 1 },
        sessionId
      );
      await cdp.send("Input.dispatchMouseEvent", { ...base, type: "mouseReleased" }, sessionId);
      report.step(`clicked ${what}`);
      await settle();
    };

    const snap = () => evalPage(snapshotExpr(seedDish.name));

    // --- 1. First paint --------------------------------------------------
    await cdp.send("Page.navigate", { url }, sessionId);
    await until(async () => (await evalPage("document.querySelectorAll('li.dish').length")) > 0, {
      label: "the menu to render",
    });
    // A marker only a genuine document load can clear — belt to the navigation
    // counter's braces.
    await evalPage("window.__favesDeviceCheck = 'alive'");
    const navsAfterLoad = navigations;

    const first = await snap();
    report.check(
      "menu renders with allergen-tagged dishes",
      first.dishes > 0 && first.allergen.length >= 5,
      `${first.dishes} dishes, ${first.allergen.length} tagged ${ALLERGEN.key}`
    );
    report.check(
      "no dish is flagged before any preference is set",
      first.flagged.length === 0 && first.flaggedChips === 0,
      `${first.flagged.length} flagged rows, ${first.flaggedChips} flagged tag chips`
    );
    report.check(
      "seeded heart and rating render for the first profile",
      first.heart === "true" && first.rating === String(SEED_RATING),
      `${seedDish.name}: heart=${first.heart}, rating=${first.rating}`
    );
    const firstProfile = first.profile;

    // --- 2. Flip an allergen preference, live ----------------------------
    await click("#overflow-btn");
    await click("#settings-btn");
    await until(async () => (await snap()).settingsOpen, { label: "the Settings sheet to open" });
    report.check("Settings opens from the menu page's ⋯ menu", true);

    await click(".settings-row", "Food preferences");
    await click(`.pref-chips-avoid .pref-chip[data-key="${ALLERGEN.key}"]`);
    const chipOn = await evalPage(
      `document.querySelector('.pref-chips-avoid .pref-chip[data-key="${ALLERGEN.key}"]')` +
        `.getAttribute("aria-pressed")`
    );
    report.check(`"${ALLERGEN.chip}" reads as flagged in Settings`, chipOn === "true", `aria-pressed=${chipOn}`);

    const flipped = await snap();
    report.check(
      "allergen warnings light up live on every matching dish",
      flipped.flagged.length > 0 && same(flipped.flagged, flipped.allergen),
      `${flipped.flagged.length} of ${flipped.allergen.length} tagged dishes flagged, ` +
        `${flipped.flaggedChips} tag chips shouting`
    );
    report.check(
      "no reload or navigation was needed",
      flipped.sentinel === "alive" && navigations === navsAfterLoad,
      `sentinel=${flipped.sentinel}, navigations since load=${navigations - navsAfterLoad}`
    );
    report.check(
      "hearts and ratings survive the safety re-render",
      flipped.heart === "true" && flipped.rating === String(SEED_RATING),
      `${seedDish.name}: heart=${flipped.heart}, rating=${flipped.rating}`
    );

    // --- 3. Switch profile ------------------------------------------------
    await click(".settings-back");
    await click(".settings-row", "using Faves");
    await click('.profile-btn[data-act="add"]');
    await click("#profile-name-input");
    await cdp.send("Input.insertText", { text: GUEST_NAME }, sessionId);
    await click(".profile-btn-primary");
    await settle();

    const switched = await snap();
    report.check(
      "the new profile is the one browsing",
      switched.profile === GUEST_NAME,
      `browsing as "${switched.profile}" (was "${firstProfile}")`
    );
    // Requires the *transition*, not just the end state: "nothing flagged" is
    // also true of a menu that never flagged anything, so a broken re-apply
    // would sail through an end-state-only assertion.
    report.check(
      "safety treatment re-applies for the new profile — warnings clear",
      flipped.flagged.length > 0 && switched.flagged.length === 0 && switched.flaggedChips === 0,
      `${flipped.flagged.length} flagged before the switch → ${switched.flagged.length} after ` +
        `(${switched.flaggedChips} flagged tag chips)`
    );
    report.check(
      "hearts and ratings re-apply per profile",
      switched.heart === "false" && switched.rating === "0",
      `${seedDish.name}: heart=${switched.heart}, rating=${switched.rating}`
    );
    report.check(
      "the profile switch needed no reload either",
      switched.sentinel === "alive" && navigations === navsAfterLoad,
      `sentinel=${switched.sentinel}, navigations since load=${navigations - navsAfterLoad}`
    );

    // --- 4. Switch back ---------------------------------------------------
    // The reverse direction is the one that would betray a one-way re-render:
    // warnings must come *back*, not merely go away.
    await click(".profile-list .profile-chip", firstProfile);
    await settle();
    const back = await snap();
    report.check(
      "switching back restores the first profile's warnings",
      same(back.flagged, back.allergen) && back.flagged.length > 0,
      `browsing as "${back.profile}", ${back.flagged.length} dishes flagged again`
    );
    report.check(
      "switching back restores the first profile's heart and rating",
      back.heart === "true" && back.rating === String(SEED_RATING),
      `${seedDish.name}: heart=${back.heart}, rating=${back.rating}`
    );
    report.check(
      "still one page load for the whole run",
      back.sentinel === "alive" && navigations === navsAfterLoad,
      `navigations since load=${navigations - navsAfterLoad}`
    );

    console.log(`\n${report.failed ? "FAILED" : "OK"} — ${report.passed} passed, ${report.failed} failed`);
    return report.failed ? 1 : 0;
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc);
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    if (opts.keepProfile) console.log(`Chrome profile kept at ${profileDir}`);
    else await rm(profileDir, { recursive: true, force: true });
  }
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(2);
}
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}
try {
  process.exit(await run(opts));
} catch (err) {
  // A harness failure is not an app verdict — exit 2 so the two never blur.
  console.error(`\nharness error: ${err.message}`);
  process.exit(2);
}
