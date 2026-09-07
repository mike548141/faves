// The browser harness the real-browser checks share — a static server for
// `site/`, a Chrome DevTools Protocol client over the platform's own WebSocket,
// a throwaway-profile Chrome launcher, and the small driver (evaluate, click,
// press) each check drives the page with.
//
// WHY IT IS A LIBRARY. It began inside `tools/device_check.mjs`, which was the
// only thing that needed it. `tools/cook_check.mjs` needs exactly the same
// machinery pointed at a different screen, and a second copy of a CDP client is
// a second place for a platform quirk to be fixed once and missed once.
// Extracted verbatim rather than rewritten, so the allergen check it came from
// behaves identically.
//
// NOT PART OF THE SHIPPED SITE. Nothing here runs in a browser from `site/`; it
// is dev tooling, like `tools/serve.py`. Node is a measuring instrument, never a
// build or runtime dependency (ADR 0001) — hence the raw WebSocket rather than
// puppeteer, and nothing to npm install.
//
// WHAT IT OWNS ON BEHALF OF EVERY CHECK (twelve at 2026-08-17), added 2026-08-17 — each of these is
// here rather than in the tools because each is a way a check can lie, and a
// tool that can forget to guard against it will:
//   · reaping its own Chrome and profile directory on abnormal exit, and
//     sweeping the orphans left by runs no handler could catch;
//   · the verdict line, so every run states the TREE and SHELL_VERSION it was
//     measured against — a session once verified against a tree that did not
//     contain its change, and the run was green;
//   · classifying a CDP transport failure as a HARNESS error, so "the browser
//     stopped answering" can never print as `FAIL <assertion name>`;
//   · `need()`, so a check that reaches for an element the page no longer has
//     fails by NAMING it — not as a null TypeError, and never as exit 2;
//   · `untilPresent()` / `untilStable()`, so a check that WAITS for an element
//     the page no longer has fails the same way — the half `need()` did not
//     cover, split apart on the owner's ruling of 2026-08-22;
//   · `exitFromError()`, the one place a tool's top-level `catch` turns an
//     escaped error into an exit code — because a tool that classifies for
//     itself will classify a site failure as a transport one;
//   · the STABLE-BOX WAIT inside `click()`, so no tool can dispatch into a
//     control that is still travelling through the coordinate it was measured
//     at, and the settle time it observed is reported rather than absorbed;
//   · the WHOLE-CHECK RETRY, so a `untilPresent` wait starved by machine load
//     is re-run once from scratch instead of being written down as a
//     regression — one mechanism for sixteen tools, never a per-call retry
//     (ADR 0100).

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, rm, stat } from "node:fs/promises";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, normalize } from "node:path";

export const CHROME =
  process.env.FAVES_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

/**
 * `overlay` is an optional Map of absolute pathname → string body, served
 * instead of the file at that path (or where no file exists at all).
 *
 * It exists so a check can exercise a state the CORPUS DOES NOT HOLD. The
 * shipped data has no closed venue in it — 55 records, every one trading — so
 * the branch card's behaviour for a shut-down chain could not be asserted
 * against any real file. The alternatives were both worse: inventing a closed
 * venue in `site/data/` ships a fiction to every phone, and stubbing `fetch` in
 * the page tests a fake instead of the real load path. An overlay keeps the
 * browser doing exactly what it does in life — one HTTP GET of one venue JSON —
 * and only the bytes are a fixture. Everything else on the tree is the real
 * working tree, which is what the second line of the summary reports.
 */
export function startServer(port, siteDir, overlay = null) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const stub = overlay?.get(path);
    if (stub !== undefined) {
      res.writeHead(200, {
        "Content-Type": MIME[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store, must-revalidate",
      });
      res.end(stub);
      return;
    }
    let file = normalize(join(siteDir, path));
    if (!file.startsWith(siteDir)) {
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
    server.listen(port, "127.0.0.1", () => {
      // Registered so the whole-check retry can hand its port back before it
      // spawns the second run. On the default `--port 0` nothing collides
      // anyway, but a run given an explicit port would otherwise re-exec into
      // an EADDRINUSE and report a harness error instead of the assertion it
      // was retrying.
      liveServers.add(server);
      res({ server, port: server.address().port });
    });
  });
}

/** Every server this process started, so {@link reapAll} can let go of the
 *  port as well as of the browser. */
const liveServers = new Set();

// --- Chrome DevTools Protocol over a raw WebSocket ----------------------
// Node 24 ships a global WebSocket, which is the whole client: one socket to the
// browser, flat sessions (`sessionId`) for the page target.

// --- Telling a broken browser apart from a broken page -------------------
// 🛑 A TRANSPORT FAILURE MUST NEVER RENDER AS AN ASSERTION FAILURE. Measured
// 2026-08-17 on a loaded machine with five sessions live: `boot_check` 4 runs →
// 2 pass, 2 FAIL; `recipe_check` 8 runs → 4 OK, 4 abort. Both land on this
// file's 30-second CDP timeout, from two different tools, so the flakiness the
// roadmap files under `cook_check` is the SHARED HARNESS's. A check with no
// timing assumptions in its body inherits it anyway, because the timeout is in
// the transport, not in the assertions.
//
// The dangerous half is what it looks like. `recipe_check` at least dies with a
// harness error and exit 2. `boot_check` printed this:
//
//     FAIL  home: the filter bar is live (counts rendered)
//             Error: Runtime.evaluate timed out after 30s
//
// — a named assertion, the word FAIL, exit 1: byte-indistinguishable from a
// real regression. That is the decorative-guard shape (ADR 0072) in a new
// place — the output is the same whether or not the thing it guards is broken —
// and the tools cannot fix it locally, because the pattern that swallows it is
// the perfectly reasonable `catch (e) { report.check(name, false, e.message) }`
// each of them wraps its risky sections in.
//
// So the classification is made HERE and enforced in `Report.check`, which is
// the one funnel every assertion in every check tool passes through.

/** Latched, not passed: the tools catch broadly by design, so the fact that the
 *  transport died has to survive being caught and discarded. */
let transportBroken = null;

/**
 * The sentinel a page-side lookup throws when the element it wanted is not
 * there. It is a string rather than a class because it has to survive the trip
 * out of the page: CDP hands back an exception *description*, not an object,
 * so the only thing that crosses the boundary is text.
 */
const MISSING_TAG = "MISSING ELEMENT —";

/**
 * Raised when a check reached for an element the page does not have.
 *
 * WHY THIS IS ITS OWN CLASS. Before it existed, a deleted element produced a
 * raw `TypeError: Cannot set properties of null` from inside `evalPage`, which
 * arrived as an unhandled rejection and left through the `uncaughtException`
 * handler — **exit 2**, this repo's code for "the browser stopped answering,
 * this says nothing about the site". So a real regression wore a transport
 * flake's clothes, and CLAUDE.md tells readers to believe the exit code. That
 * is the wrong way round: a missing element is a statement about the SITE, so
 * it must read as a failed assertion (exit 1) that names what it wanted.
 */
export class MissingElementError extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingElementError";
  }
}

/**
 * Build a page-side expression that resolves `selector` or throws a sentence
 * naming what it wanted. Use it anywhere a check DEREFERENCES a lookup —
 * `.click()`, `.focus()`, `.hidden = …`, `.textContent` — because those are the
 * sites where a removed element becomes a null TypeError.
 *
 * WHY IT EXISTS. [ADR 0083] removed the `#geo-ask` pill; `filter_row_check`
 * drove that id directly and died mid-run on a null, with no summary line. The
 * retarget fixed that one line and left the SHAPE — twenty-odd more
 * dereferences one deletion away from the same crash. This makes the failure
 * mode uniform and self-describing instead.
 *
 * `root` takes a page-side expression when the lookup is scoped to something
 * already in hand (a row, a dialog) rather than to the document.
 */
export const need = (selector, root = "document") => {
  const sel = JSON.stringify(selector);
  const msg = JSON.stringify(
    `${MISSING_TAG} this check wanted ${selector}, and nothing on the page matches it`
  );
  return `(${root}.querySelector(${sel}) ?? (() => { throw new Error(${msg}); })())`;
};

/** The sentinel prefix an unsettled-geometry failure carries, for the same
 *  reason {@link MISSING_TAG} exists: a reader greps the output. */
const UNSTABLE_TAG = "UNSTABLE ELEMENT —";

/**
 * Raised when a control the check wanted to press never came to rest.
 *
 * WHY IT IS A SITE CLAIM AND NOT A HARNESS ONE. [ADR 0093] shipped with this
 * question open — `picks_check` threw a plain `Error: #settings-btn has no
 * clickable box` from a geometry helper, which is neither a
 * {@link MissingElementError} nor a {@link HarnessError}, so `exitFromError`
 * sent it to **exit 2** with no `FAIL` line at all. The owner ruled it on
 * 2026-09-07 (roadmap `210/070`): *a box that never settles is a FAILED
 * ASSERTION about the site, not a silent hang and not a harness error.* A
 * control that is still moving two whole seconds after the page was asked for
 * it is a defect a person would hit, so it reads as **exit 1** and names what
 * it watched.
 *
 * 🛑 IT IS DELIBERATELY NOT RETRYABLE. See {@link exitFromError}: the whole
 * point of the ruling is that an animation race must be visible, and a retry
 * would make it permanent and invisible.
 */
export class UnstableElementError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnstableElementError";
  }
}

/**
 * Raised when the browser stopped answering — never when a page is wrong.
 *
 * The latch is set in the constructor rather than at each throw site on
 * purpose: it makes "a transport error was raised" impossible to raise without
 * recording, which is the property the enforcement in `Report.check` rests on.
 */
export class HarnessError extends Error {
  constructor(message) {
    super(message);
    this.name = "HarnessError";
    transportBroken = message;
  }
}

/** How long a single CDP call may take. Configurable because the right value is
 *  a property of the MACHINE, not of the code: 30s is generous on a quiet
 *  laptop and tight with five agent sessions live, and editing a shared library
 *  to get through a busy afternoon is how a timeout ends up wrong for everyone. */
export const CDP_TIMEOUT_MS = Number(process.env.FAVES_CDP_TIMEOUT_MS) || 30_000;

/** How long a click may wait for its target's box to stop moving before it
 *  gives up and FAILS. Bounded because the owner's condition on `210/070` was
 *  that a box which never settles is a failed assertion and not a hang; two
 *  seconds because the site's longest transition is a fraction of that, so
 *  anything reaching this bound is either broken or genuinely janky. Same
 *  reasoning as CDP_TIMEOUT_MS for making it an env var, and the same warning:
 *  never lower it to make a run finish. */
export const CLICK_SETTLE_MS = Number(process.env.FAVES_CLICK_SETTLE_MS) || 2_000;

/**
 * What the stabilising wait actually cost, and what it actually saw.
 *
 * 🔑 THE SECOND NUMBER IS THE POINT, not the first. The owner accepted the wait
 * on condition it was measured, and named a failure mode a runtime figure would
 * never show: **a wait that is too generous hides a real regression.** If a
 * control starts taking 400 ms to settle because someone shipped a janky
 * animation, a click that patiently waits it out turns a user-visible defect
 * into a green run. So every run reports how many clicks needed more than the
 * single comparison frame, and the worst one by name.
 */
export const clickStats = { clicks: 0, waited: 0, settleMs: 0, worstMs: 0, worst: null };

export class Cdp {
  #ws;
  #next = 1;
  #pending = new Map();
  #handlers = new Map();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener("message", (ev) => this.#receive(String(ev.data)));
    ws.addEventListener("close", () => {
      for (const { reject } of this.#pending.values()) {
        reject(new HarnessError("devtools connection closed"));
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
      // A HarnessError, not an Error. Only these two rejections — the call that
      // never came back and the socket that closed — are transport; a page that
      // throws comes back as a normal CDP result with `exceptionDetails` and
      // stays an ordinary failure, which is what keeps the line between "the
      // browser stopped answering" and "the page is wrong" sharp.
      //
      // NO RETRY, deliberately. A bounded retry here is tempting and would be
      // wrong: CDP calls are not idempotent — re-issuing `Input.dispatchMouseEvent`
      // taps twice and `Page.navigate` reloads — so a transport retry can
      // silently change what the assertion downstream is measuring. A retry that
      // can alter the measurement is one short step from re-running until green,
      // which is the behaviour this repo keeps writing ADRs about. Give a slow
      // machine more rope with FAVES_CDP_TIMEOUT_MS instead.
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new HarnessError(`${method} timed out after ${CDP_TIMEOUT_MS / 1000}s`));
      }, CDP_TIMEOUT_MS);
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

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Two waits, because a wait is two different claims --------------------
// 🛑 A WAIT CARRIES A VERDICT AND THE OLD `until()` THREW IT AWAY. `need()`
// fixed the DEREFERENCE case: a check that reaches for a missing element now
// fails by name at exit 1. A check that WAITS for one was untouched —
// `boot_check`'s wait on `#about-btn` threw a plain `Error`, which arrived at
// the top level as "something unclassified went wrong" and left through
// **exit 2**, this repo's code for "the browser stopped answering; nothing here
// says anything about the site". So deleting an element a check waits on
// produced a site regression wearing a transport flake's clothes, and CLAUDE.md
// tells readers to believe the exit code over the message.
//
// OWNER-RULED 2026-08-22 (option 2 of three): split the wait by WHAT IT CLAIMS.
// Options 1 (classify every timeout as an assertion) and 3 (leave it and
// document it) were both declined — so a busy laptop must still never be able
// to manufacture a regression, and "documented" was not good enough.
//
// The reasoning it rests on: every call site already knows which kind it is,
// because its author knew when they wrote it. The old encoding discarded that
// and then asked the reader to guess from an exit code. This does not add
// information; it stops throwing information away.
//
// 🚩 THE NAMES ARE NOT THE ONES THE RULING FIRST SAID, ON PURPOSE. It named
// `untilSettled`; this module already exports `settleUntil`, which polls a
// predicate and on timeout RETURNS its last value instead of throwing. Two
// exports differing only by word order, with opposite behaviour, is a trap —
// so the naming fork was put back to the owner on 2026-09-06 and he took
// `untilPresent` / `untilStable`. `settleUntil` is left exactly as it is; no
// third API was touched.

/** The shared loop. Only the error the two wrappers hand it differs, which is
 *  the whole point: one wait, two verdicts. */
async function poll(fn, { label, timeout = 15_000, step = 100 }, makeError) {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    last = await fn();
    if (last) return last;
    if (Date.now() > deadline) throw makeError(label, timeout);
    await sleep(step);
  }
}

/**
 * Wait for something the SITE promises. Returns the truthy value.
 *
 * On timeout this throws a {@link MissingElementError}, so it lands as a named
 * assertion failure at **exit 1** — the same verdict `need()` gives, because it
 * is the same statement: the page does not have the thing this check names.
 *
 * Use it for anything the page is supposed to produce: a screen that renders, a
 * dialog that opens, a panel that closes, a control that appears. Waiting for a
 * DISAPPEARANCE counts too — "the sheet to close" is as much a promise as "the
 * sheet to open", and both fail the same way when the feature has gone.
 */
export async function untilPresent(fn, opts) {
  return poll(fn, opts, (label, timeout) => {
    const err = new MissingElementError(
      `${MISSING_TAG} this check waited ${timeout / 1000}s for ${label},` +
        ` and the page never got there`
    );
    // The ONE flag the whole-check retry keys on. A `need()` dereference makes
    // the same class of error and must NOT be retried — it does not wait, so
    // there is no budget for a loaded machine to starve, and retrying it only
    // doubles the time a real regression takes to report. See exitFromError.
    err.fromWait = true;
    return err;
  });
}

/**
 * Wait for something about TIMING — the browser, the platform, or a transient
 * the site never promised to finish by any particular moment.
 *
 * On timeout this throws a plain `Error`, which reaches a tool's top level
 * unclassified and leaves at **exit 2**: conservative, and identical to what
 * every wait did before the split. Use it when the thing being waited for is
 * not the site's to promise — a scroll coming to rest, a browser target
 * activating, a service worker registering — and when in doubt, because being
 * wrong in this direction costs a re-run and being wrong in the other invents a
 * regression out of a loaded laptop.
 */
export async function untilStable(fn, opts) {
  return poll(fn, opts, (label) => new Error(`timed out waiting for ${label}`));
}

/**
 * Poll until `pred(value)` holds, then return the value — but on timeout return
 * the last value seen instead of throwing. For settling before an *assertion*:
 * a state that never arrives must read as a failed check, not as a harness
 * error, or the two verdicts blur.
 */
export async function settleUntil(fn, pred, { timeout = 3000, step = 50 } = {}) {
  const deadline = Date.now() + timeout;
  let last = await fn();
  while (!pred(last) && Date.now() < deadline) {
    await sleep(step);
    last = await fn();
  }
  return last;
}

// --- Reaping our own browsers -------------------------------------------
// WHY THIS LIVES HERE AND NOT IN EACH TOOL. Every check already tidies up in
// its `finally`, and on the happy path that works. The leak is the ABNORMAL
// exit: a Ctrl-C, a SIGTERM, an uncaught exception, an agent giving up on a
// stalled run. Node dies, the Chrome child reparents to init and keeps
// running. Measured on the unmodified harness 2026-08-17: killing a live
// `boot_check` left **12 surviving Chrome processes** on SIGTERM and 10 on
// SIGINT, plus its profile directory, every single time.
//
// WHY IT MATTERS MORE THAN IT SOUNDS. Six such orphans pushed this machine's
// 1-minute load past 100 on 2026-08-16. At that load a check does not fail —
// it stalls silently on a CDP call and prints a wall of PASS with no summary
// line, which is exactly the trap CLAUDE.md documents for `sync_check`, from
// no code change at all. An agent then bisected it across five arms plus a
// control, every arm stalled identically at 30 PASS, and it concluded
// "cook_check cannot complete on this machine". It could not, because the
// orphans were running underneath every arm. A bisect whose every arm shares
// the confound looks rigorous and means nothing.
//
// A per-tool fix would be a second place for the same platform quirk to be
// fixed once and missed once, which is the reason this library exists at all.

/** Every Chrome this process launched → the profile directory we made for it. */
const liveChromes = new Map();
let reaperInstalled = false;

/** Kill and delete everything still registered. Synchronous by requirement:
 *  node runs no async work after `exit` fires, so an awaited `stopChrome`
 *  here would return a promise nobody is left to settle. */
function reapAll() {
  for (const [proc, profileDir] of liveChromes) {
    try {
      proc.kill("SIGKILL");
    } catch {
      /* already gone — nothing to reap */
    }
    if (profileDir) {
      try {
        rmSync(profileDir, { recursive: true, force: true });
      } catch {
        /* best effort: a leaked directory is cheaper than a crash in the
           handler that is trying to stop a leaked browser */
      }
    }
  }
  liveChromes.clear();
  for (const server of liveServers) {
    try {
      // closeAllConnections first: `close()` alone waits on keep-alives, and
      // the caller may be about to re-bind this port in a child process.
      server.closeAllConnections?.();
      server.close();
    } catch {
      /* already closed — the port goes with the process either way */
    }
  }
  liveServers.clear();
}

function installReaper() {
  // Once per process, not once per launch: nine checks × repeated calls would
  // otherwise trip node's max-listeners warning and bury it in the output.
  if (reaperInstalled) return;
  reaperInstalled = true;
  process.on("exit", reapAll);
  for (const [signal, number] of [
    ["SIGINT", 2],
    ["SIGTERM", 15],
  ]) {
    // Reap, then actually die with the conventional code. Swallowing the
    // signal would be worse than the leak it prevents: Ctrl-C has to still
    // stop the run. `process.exit` re-enters `reapAll` via the `exit`
    // handler, which is a no-op once the registry is cleared.
    process.on(signal, () => process.exit(128 + number));
  }
  // Print it and exit non-zero. A harness that eats an exception and exits 0
  // reads as a pass, which is the one outcome worse than a leaked browser. The
  // classification is `exitFromError`'s, shared with every tool's own top-level
  // catch, so the two can never drift apart.
  process.on("uncaughtException", exitFromError);
}

// --- Sweeping the orphans a handler can never catch ----------------------
// THE TWO HALVES ARE NOT EQUALS. The handlers above are the RELIABLE half:
// they fire on the signals that actually kill a check, and they know exactly
// what this process created. This sweep is the OPPORTUNISTIC half — it guesses
// from the outside, so it is deliberately built to under-delete.
//
// It exists because a handler cannot run on SIGKILL, and cannot retroactively
// clean up what leaked before this code existed: $TMPDIR held **189**
// `faves-*-check-*` directories on 2026-08-17 (2.6 GB an hour earlier), of
// which 128 were `faves-boot-check` — and boot_check, to_top_check and
// filter_row_check never removed their profile at all, so those leaked on the
// HAPPY path too. Directories also long outlive the processes that made them:
// a peer session found some dated the previous day with nothing attached.
//
// 🚩 THE DIRECTORY SET IS NOT STABLE BETWEEN TWO READS MINUTES APART. Two
// sessions counted 265 and 189 entries in the same $TMPDIR with overlapping
// prefixes and could not reconcile it; the cause is unexplained and is not
// invented here. The behaviour is what the design has to survive, so the
// holder test is re-run IMMEDIATELY BEFORE each `rm` rather than once up
// front — a thirty-second-old "unheld" verdict is precisely how you delete a
// live peer's profile out from under its run.

const PROFILE_DIR_RE = /^faves-[a-z0-9-]+-check(-[ab])?-[A-Za-z0-9]{6}$/;

// A dir this young may belong to a peer session that has run `mkdtemp` but not
// yet reached `spawn` — in `sync_check` that gap is seconds wide, because
// profile B sits idle while profile A's browser boots. Age and the argv test
// are deliberately INDEPENDENT: argv catches the long-running-and-live case,
// age catches the created-but-not-yet-launched one, and a dir has to fail both
// before anything is deleted.
const SWEEP_MIN_AGE_MS = 30 * 60_000;

/**
 * The profile directories argv says are in use, by basename.
 *
 * The discriminator: Chrome — and every renderer and helper it forks — carries
 * `--user-data-dir=<path>` in its own argv, so the process table is the
 * authority on which directories are live. `-ww` is load-bearing: without it
 * macOS truncates each line to the terminal width, a long temp path is cut
 * off, and a directory that IS held silently reads as unheld. Basenames rather
 * than full paths because `/var/folders/…` and `/private/var/folders/…` are
 * the same directory reached two ways, and a false "held" is the safe error.
 */
function heldProfileNames() {
  const out = execFileSync("/bin/ps", ["-Awwo", "args="], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 10_000,
  });
  const held = new Set();
  for (const m of out.matchAll(/--user-data-dir=(\S+)/g)) held.add(basename(m[1]));
  return held;
}

let sweptThisProcess = false;

/**
 * Delete `faves-*-check-*` profile directories in $TMPDIR that no live process
 * holds and that are older than {@link SWEEP_MIN_AGE_MS}.
 *
 * CONSERVATIVE BY CONSTRUCTION. Up to five agent sessions run browser checks on
 * this machine at once, and deleting a peer's profile mid-run would be a far
 * worse bug than the leak this cleans up. So: if the process table cannot be
 * read at all, nothing is deleted; anything argv mentions is left alone;
 * anything recent is left alone; and any single directory that will not stat
 * is left alone rather than guessed at.
 *
 * It announces its result even when that result is zero. A sweep nobody can see
 * is the decorative-guard pattern (ADR 0072) — its output would be the same
 * whether it worked or never ran.
 *
 * `minAgeMs` is lowered only to PROVE the argv guard, never in normal use: with
 * the age filter standing, a live peer's profile is spared for two reasons and
 * a sparing test cannot say which one did it. Set it to 0 beside a running
 * check and the argv test is the only thing left holding the line — which is
 * how this one was verified, after a peer session shipped a held-directory
 * guard whose shell expansion produced junk and which therefore guarded
 * nothing, indistinguishably from one that worked.
 */
export async function sweepOrphanProfiles({ announce = true, minAgeMs = SWEEP_MIN_AGE_MS } = {}) {
  const root = tmpdir();
  const say = (msg) => announce && console.log(`  sweep    ${msg}`);
  let held;
  try {
    held = heldProfileNames();
  } catch (e) {
    say(`skipped — cannot read the process table (${e.message}); deleted nothing`);
    return 0;
  }
  let entries;
  try {
    entries = await readdir(root);
  } catch (e) {
    say(`skipped — cannot read ${root} (${e.message}); deleted nothing`);
    return 0;
  }
  const cutoff = Date.now() - minAgeMs;
  let removed = 0;
  let inUse = 0;
  let recent = 0;
  for (const name of entries) {
    if (!PROFILE_DIR_RE.test(name)) continue;
    if (held.has(name)) {
      inUse++;
      continue;
    }
    const dir = join(root, name);
    try {
      const st = await stat(dir);
      if (st.mtimeMs > cutoff) {
        recent++;
        continue;
      }
      // Ask the process table again, now, for this one directory. The cost is
      // one `ps` per survivor of the name+age filter — normally none, and
      // bounded by tens of milliseconds each even in the 189-directory case —
      // and it buys the only property that matters here: nothing is deleted on
      // the strength of a stale reading.
      if (heldProfileNames().has(name)) {
        inUse++;
        continue;
      }
      await rm(dir, { recursive: true, force: true });
      removed++;
    } catch {
      // Cannot establish that it is dead ⇒ leave it. Being wrong in this
      // direction costs disk; being wrong in the other costs a peer's run.
      inUse++;
    }
  }
  const left = [];
  if (inUse) left.push(`${inUse} in use`);
  if (recent) left.push(`${recent} younger than ${minAgeMs / 60_000}m`);
  say(
    `${removed} orphan profile${removed === 1 ? "" : "s"} removed from ${root}` +
      (left.length ? ` (left ${left.join(", ")})` : "")
  );
  return removed;
}

// --- Chrome ------------------------------------------------------------

export async function launchChrome({ profileDir, headed, width = 390, height = 844 }) {
  if (!existsSync(CHROME)) {
    throw new Error(`Google Chrome not found at ${CHROME} (set FAVES_CHROME)`);
  }
  installReaper();
  // Once per process, before the first browser exists. Note that the caller has
  // ALREADY made its profile directory by this point, so the sweep sees this
  // run's own profile and is stopped from eating it by the age guard alone —
  // which is the clearest demonstration going that the age guard is doing work,
  // not decorating. FAVES_NO_SWEEP keeps the debris for anyone debugging it.
  if (!sweptThisProcess && !process.env.FAVES_NO_SWEEP) {
    sweptThisProcess = true;
    await sweepOrphanProfiles();
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
    `--window-size=${width},${height}`,
    "about:blank",
  ];
  if (!headed) args.unshift("--headless=new", "--disable-gpu");
  const proc = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
  // Registered the instant it exists, not once it is known healthy: a Chrome
  // that dies on the way up still has to be reaped, and the `await` below is
  // the very window a Ctrl-C is most likely to land in.
  liveChromes.set(proc, profileDir);
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
  // untilStable: a browser that never writes its port file is a broken BROWSER,
  // which is the one thing exit 2 exists to say.
  const contents = await untilStable(
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

/**
 * Stop a browser this harness launched and remove the profile directory it was
 * given, unless the caller asked to keep it (`--keep-profile`).
 *
 * The directory is the library's job for the same reason the process is: three
 * checks — boot, to_top, filter_row — never removed theirs at all, and between
 * them accounted for 178 of the 189 directories found in $TMPDIR on
 * 2026-08-17. A tool that forgets is not a tool that should be able to.
 *
 * Kill and delete are INDEPENDENT and in that order for a reason: a browser
 * that is already gone is the normal case, not an error (a peer session found
 * four ten-hour-old orphan trees and something else reaped them before it could
 * send a signal), and directories outlive processes by a long way. So a kill
 * that does nothing must never stop the delete.
 */
export async function stopChrome(proc, { keepProfile = false } = {}) {
  const profileDir = liveChromes.get(proc);
  // Deregister first, so the reaper cannot race an orderly shutdown.
  liveChromes.delete(proc);
  try {
    if (proc && proc.exitCode == null) {
      proc.kill("SIGTERM");
      const gone = await Promise.race([
        new Promise((r) => proc.once("exit", () => r(true))),
        sleep(3000).then(() => false),
      ]);
      if (!gone) proc.kill("SIGKILL");
    }
  } catch {
    /* already gone, or never started — normal, and no reason to skip the rm */
  }
  if (profileDir && !keepProfile) {
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

// --- The verdict --------------------------------------------------------

/**
 * Which tree was actually measured: absolute path, its `SHELL_VERSION`, and
 * its git identity where one is cheaply available.
 *
 * The version is the half that survives two worktrees having the same path
 * shape — two checkouts of faves differ by one directory name, which is easy
 * to skim past, but they almost never carry the same `SHELL_VERSION`.
 *
 * Never throws. A summary line that dies is worse than one that is partly
 * blank, because it takes the verdict with it.
 */
function treeIdentity(siteDir) {
  const parts = [`tree ${siteDir}`];
  let version = null;
  try {
    version =
      readFileSync(join(siteDir, "sw.js"), "utf8").match(
        /SHELL_VERSION\s*=\s*["']([^"']+)["']/
      )?.[1] ?? null;
  } catch {
    /* no sw.js where one was expected — which is itself worth seeing */
  }
  parts.push(version ? `shell ${version}` : "shell version unknown");
  try {
    // Nice-to-have, never a dependency: the harness serves a plain directory
    // and must still report on a tree with no .git at all. Read-only, and
    // time-boxed so a wedged index cannot hold the verdict hostage.
    const git = (...args) =>
      execFileSync("git", ["-C", siteDir, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      }).trim();
    const branch = git("rev-parse", "--abbrev-ref", "HEAD");
    const sha = git("rev-parse", "--short", "HEAD");
    if (branch && sha) parts.push(`${branch}@${sha}`);
  } catch {
    /* not a checkout, or no git — the path and version still identify it */
  }
  return parts.join(" · ");
}

/**
 * Stop the run and say, unmistakably, that the BROWSER failed — not the site.
 *
 * The wording matters as much as the exit code. The failure this replaces read
 * as `FAIL  home: the filter bar is live (counts rendered)`, which sent a
 * session hunting a regression in a filter bar that was fine.
 */
function abortAsHarnessError(reachedAssertion) {
  console.log(
    `\nHARNESS ERROR — the browser stopped answering; this is NOT a failed assertion` +
      `\n   ${transportBroken}` +
      `\n   reached: ${reachedAssertion}` +
      `\n   nothing here says anything about the site. Check the machine for load or` +
      `\n   orphan Chromes (pgrep -f 'user-data-dir=.*faves-'), then run it again.` +
      `\n   A slow machine can be given more rope: FAVES_CDP_TIMEOUT_MS=60000`
  );
  process.exit(2);
}

// --- Running the whole check a second time --------------------------------
// 🛑 THIS REVERSES A SENTENCE THIS FILE STILL CARRIES, AND BOTH ARE TRUE.
// `Cdp.send` says "NO RETRY, deliberately" and gives the reason: CDP calls are
// not idempotent, so re-issuing one silently changes what the next assertion
// measures. That reason is about ONE CALL and it is untouched — nothing here
// re-issues anything.
//
// What the owner ruled on 2026-09-07 (roadmap `340/200`) is the other shape: a
// `untilPresent` wait starved past its budget by machine load throws a
// MissingElementError and lands as `FAIL MISSING ELEMENT`, exit 1 —
// byte-identical to a real regression, and CLAUDE.md tells the reader to
// believe it. Measured the day [ADR 0093] shipped: `cook_check` exit 1 inside a
// 15-check sweep at load 18–27, then 85 passed / 0 failed on the SAME commit
// once the machine was quiet. So the whole check re-runs once, in a NEW
// PROCESS with a new Chrome and a new profile, and a failure is reported only
// if it happens twice. A fresh process has none of the coupling a per-call
// retry has: no latched module state, no half-driven page, no browser that has
// already been clicked.
//
// 🔎 It PRINTS, every time. A retry nobody can see is [ADR 0072]'s decorative
// guard pointed the other way: it would turn a reproducible failure into a
// quiet one. So the first run's verdict stays on screen, the retry announces
// itself before it starts, and the last line says whether one run failed or
// both did.

const RETRY_ENV = "FAVES_CHECK_IS_RETRY";

/**
 * Re-run this whole check once and exit with the second run's verdict.
 *
 * Returns `false` — without running anything — when this process IS already the
 * retry, or when there is no script path to re-execute. Otherwise it does not
 * return at all.
 */
function retryWholeCheck(why) {
  if (process.env[RETRY_ENV]) return false;
  const script = process.argv[1];
  if (!script) return false;
  console.log(
    `\n↻ RETRY — that failure came from a WAIT, and a loaded machine can starve a` +
      `\n   wait past its budget with nothing about the site having changed.` +
      `\n   ${why}` +
      `\n   Re-running the WHOLE check once from scratch: new process, new Chrome,` +
      `\n   new profile. Never a per-call retry — CDP calls are not idempotent.` +
      `\n   Owner-ruled 2026-09-07 (roadmap 340/200, ADR 0100); a failure is only` +
      `\n   reported if it happens TWICE.\n`
  );
  // Let go of this run's browser and its port BEFORE the second run starts —
  // otherwise the retry is measured on a machine this process is still loading,
  // which is the very condition it exists to rule out.
  reapAll();
  const started = Date.now();
  const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, [RETRY_ENV]: "1" },
  });
  const code = result.status ?? 2;
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (code === 0) {
    console.log(
      `\n↻ THE RETRY PASSED (${secs}s) — run 1 FAILED and run 2 PASSED on the same tree.` +
        `\n   Nothing about the site changed between them, so run 1 was the machine.` +
        `\n   This is a pass WITH A FLAKE RECORDED, not a clean green run: if it keeps` +
        `\n   happening, the wait's budget or the machine's load is the thing to look at.`
    );
  } else {
    console.log(
      `\n↻ BOTH RUNS FAILED (retry took ${secs}s, exit ${code}) — run 1 and run 2 agree,` +
        `\n   on two independent browsers and two fresh profiles. Load did not manufacture` +
        `\n   this one. Read the FAIL line above as a statement about the SITE.`
    );
  }
  process.exit(code);
}

/**
 * Turn an error that escaped a check's own reporting into an exit code.
 *
 * 🛑 WHY THIS IS THE LIBRARY'S JOB AND NOT EACH TOOL'S. Eight of the fifteen
 * checks ended with their own `catch (err) { console.error(…); exit(2) }`
 * around `run()`. That catch is upstream of everything this file classifies:
 * a `MissingElementError` raised inside `addon_check` never reached the
 * `uncaughtException` handler that exists to give it exit 1, because the tool
 * caught it first and called it a harness error. So `need()`'s promise — and,
 * from 2026-09-07, `untilPresent()`'s — held in the seven tools with no
 * top-level catch and was quietly void in the other eight. A rule enforced in
 * one place and re-implemented in eight is a rule that is wrong in some of
 * them; this is the one place.
 *
 * The four verdicts, in the order they are asked:
 *   · the transport died  → exit 2, with the wording that says so out loud;
 *   · a control never came to rest → exit 1, naming what it watched;
 *   · the site is missing something → exit 1, naming what was wanted — and, if
 *     a WAIT produced it, one whole re-run first (ADR 0100);
 *   · anything else       → exit 2, because an unclassified failure says
 *     nothing about the site and must not be written down as if it did.
 */
export function exitFromError(err) {
  if (err instanceof HarnessError) abortAsHarnessError("an unguarded step");
  // A control still moving after its whole budget is the SITE being wrong —
  // owner-ruled, `210/070` — so it names what it watched and exits 1.
  //
  // 🛑 AND IT IS NOT RETRIED, ON PURPOSE. The same ruling says why: "a retry
  // that papers over an animation race makes the race permanent and invisible".
  // An unsettling box IS an animation race, so re-running it is precisely the
  // papering-over the stabilising wait was built to prevent.
  if (err instanceof UnstableElementError) {
    console.log(`\nFAIL  ${err.message}`);
    console.log(
      `\nFAILED — the run stopped here; the assertions after this point did not run.` +
        `\n   This is NOT retried: a control that will not stop moving is a defect a` +
        `\n   person would hit, and running it twice would only hide it.`
    );
    process.exit(1);
  }
  // A missing element is the SITE being wrong, so it exits 1 (assertions
  // failed) and never 2 (harness error) — and it says what it wanted, which a
  // null TypeError never did.
  if (err instanceof MissingElementError) {
    console.log(`\nFAIL  ${err.message}`);
    console.log(
      `\nFAILED — the run stopped here; the assertions after this point did not run.` +
        `\n   Either the element was renamed (retarget this check) or the feature went` +
        `\n   (delete the assertion) — see the roadmap's id-durability sweep.`
    );
    // Only a WAIT is retried. `need()` raises the same class from a single
    // instantaneous read, which load cannot starve.
    if (err.fromWait) retryWholeCheck(err.message);
    process.exit(1);
  }
  console.error(`\nharness error: ${err?.message ?? err}`);
  if (err?.stack) console.error(err.stack);
  process.exit(2);
}

export class Report {
  #rows = [];
  #verbose;
  constructor(verbose) {
    this.#verbose = verbose;
  }
  step(msg) {
    if (this.#verbose) console.log(`   · ${msg}`);
  }
  check(name, ok, detail = "") {
    // The funnel. Every assertion in every check tool comes through here, so this
    // is the only place that can stop a dead browser being written down as a
    // broken page. Once the transport has gone, nothing after it measures
    // anything — so stop, say plainly what happened, and exit 2 (harness error)
    // rather than 1 (assertions failed). Exiting here skips each tool's
    // `finally`, which is safe: the `exit` handler above reaps the browser and
    // its profile, and the HTTP server dies with the process.
    if (transportBroken) abortAsHarnessError(name);
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
  /**
   * Print the whole verdict and return whether it passed, so a check ends
   * `return report.summary(SITE);`.
   *
   * WHY THE SECOND LINE EXISTS. A session's shell cwd drifted out of its
   * worktree via one compound command containing a `cd`. Its edits used
   * absolute paths and were safe; its VERIFICATION ran against a tree without
   * the change — everything green, everything meaningless. It surfaced only
   * because a passing run reported 22 assertions where the agent had just
   * reported 25. Nobody interrogates a green run, so the tree's identity has to
   * be in the artefact everyone already reads, not in a discipline.
   *
   * WHY THE FIRST LINE IS BYTE FOR BYTE WHAT IT WAS. CLAUDE.md instructs
   * readers to look for the literal `OK — 16 passed, 0 failed` out of
   * sync_check, and a grep-based reader elsewhere may lean on it. The new
   * information therefore goes BELOW, indented, and never inside that line.
   *
   * WHY IT LIVES HERE. Until 2026-08-17 every check hand-rolled this line
   * and the roadmap's claim that "browser.mjs owns the summary" was simply
   * false. It is true now, which is what makes the identity impossible to add
   * to nine places and miss in the tenth.
   */
  summary(siteDir) {
    // The last gate. A run that lost the browser between its final assertion
    // and here would otherwise print a clean `OK — N passed, 0 failed` with a
    // short N, which is the wrong-tree bug's twin: a green line nobody reads
    // twice.
    if (transportBroken) abortAsHarnessError("the summary");
    console.log(`\n${this.failed ? "FAILED" : "OK"} — ${this.passed} passed, ${this.failed} failed`);
    console.log(`   ${treeIdentity(siteDir)}`);
    // Only when this run clicked anything: four checks drive no controls at
    // all, and a line reading "clicks 0" on those is noise pretending to be
    // evidence.
    if (clickStats.clicks) {
      const settled = clickStats.clicks - clickStats.waited;
      console.log(
        `   clicks ${clickStats.clicks} · ${settled} still on the first frame, ` +
          `${clickStats.waited} waited · ${Math.round(clickStats.settleMs)}ms total` +
          (clickStats.waited
            ? `, worst ${clickStats.worstMs}ms (${clickStats.worst})`
            : "")
      );
    }
    return this.failed === 0;
  }
}

// --- Driving one page ---------------------------------------------------

// Keys cook mode and the dialogs actually use. Chrome wants the legacy virtual
// key code as well as the name, or the page sees a keypress with no identity.
const KEYS = {
  Escape: 27,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  End: 35,
  Home: 36,
  Enter: 13,
  Tab: 9,
};

/**
 * The handful of page operations every check needs, bound to one attached page
 * session. `log` receives a line per action when the caller wants tracing.
 */
export function createDriver(cdp, sessionId, log = () => {}) {
  const evalPage = async (expression) => {
    const r = await cdp.send(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
      sessionId
    );
    if (r.exceptionDetails) {
      const e = r.exceptionDetails;
      const desc = e.exception?.description || e.text || "";
      // A `need()` lookup that found nothing is a verdict about the site, not a
      // broken eval — hand it on as itself so the top-level can print it as a
      // named FAIL rather than a stack.
      if (desc.includes(MISSING_TAG)) {
        throw new MissingElementError(desc.slice(desc.indexOf(MISSING_TAG)).split("\n")[0].trim());
      }
      throw new Error(`page eval failed: ${desc}`);
    }
    return r.result.value;
  };

  // Two frames, so a render triggered by the click has painted before we look.
  const settle = () =>
    evalPage("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");

  const click = async (selector, text = null) => {
    // 🛑 THE WAIT IS INSIDE THE PAGE, AND THAT IS THE WHOLE DESIGN. A box can
    // only be shown to be still by looking at it twice with time in between,
    // and doing that from Node costs one CDP round-trip per look, on every
    // click, in sixteen tools. Comparing two consecutive ANIMATION FRAMES in
    // the page costs one frame and keeps the round-trip count exactly what it
    // was before this existed.
    const box = await evalPage(`(async () => {
      const els = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const want = ${JSON.stringify(text)};
      const el = want == null ? els[0] : els.find((e) => e.textContent.includes(want));
      if (!el) return null;
      // "instant" is load-bearing: the site sets scroll-behavior: smooth (for
      // readers who haven't asked for reduced motion), so a plain
      // scrollIntoView returns before the page has moved and the rect read
      // straight after is the pre-scroll one — a click into empty space for
      // anything far down the page.
      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
      const read = () => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      };
      // Half a pixel. Sub-pixel jitter cannot move a >= 44px tap target off
      // its own centre, and a real transition moves whole pixels per frame.
      const same = (a, b) =>
        Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5 &&
        Math.abs(a.w - b.w) <= 0.5 && Math.abs(a.h - b.h) <= 0.5;
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const t0 = performance.now();
      let prev = read();
      for (let frames = 1; ; frames++) {
        await raf();
        const now = read();
        const elapsed = +(performance.now() - t0).toFixed(1);
        // Clickable AND unchanged: a control mid-open can be perfectly still
        // at 0x0 for a frame, and dispatching at its centre would be a click
        // into nothing.
        if (same(prev, now) && now.w >= 1 && now.h >= 1) {
          return { ...now, frames, settleMs: elapsed, stable: true };
        }
        if (elapsed >= ${CLICK_SETTLE_MS}) {
          return {
            ...now, frames, settleMs: elapsed, stable: false,
            step: { dx: +(now.x - prev.x).toFixed(1), dy: +(now.y - prev.y).toFixed(1) },
            // Diagnostic only, never a decision: a box can move for reasons
            // the Web Animations API never sees, so this narrows the hunt
            // where it can and says nothing where it cannot.
            animating: (document.getAnimations ? document.getAnimations() : [])
              .filter((a) => a.playState === "running")
              .map((a) => a.animationName || a.transitionProperty || "an animation")
              .slice(0, 6),
          };
        }
        prev = now;
      }
    })()`);
    const what = `${selector}${text ? ` containing "${text}"` : ""}`;
    if (!box) throw new Error(`no element matching ${what}`);
    clickStats.clicks++;
    clickStats.settleMs += box.settleMs;
    if (box.frames > 1) {
      clickStats.waited++;
      if (box.settleMs > clickStats.worstMs) {
        clickStats.worstMs = box.settleMs;
        clickStats.worst = what;
      }
    }
    if (!box.stable) {
      const still = box.animating?.length ? `; still running: ${box.animating.join(", ")}` : "";
      throw new UnstableElementError(
        box.w < 1 || box.h < 1
          ? `${UNSTABLE_TAG} ${what} has no clickable box: ${box.settleMs}ms and` +
            ` ${box.frames} frames after the page was asked for it, it still measures` +
            ` ${box.w.toFixed(1)}x${box.h.toFixed(1)}${still}`
          : `${UNSTABLE_TAG} ${what} never came to rest: after ${box.settleMs}ms and` +
            ` ${box.frames} frames its box was still moving (last frame dx ${box.step.dx},` +
            ` dy ${box.step.dy})${still}`
      );
    }
    const base = { x: box.x, y: box.y, button: "left", clickCount: 1 };
    await cdp.send("Input.dispatchMouseEvent", { ...base, type: "mouseMoved" }, sessionId);
    await cdp.send(
      "Input.dispatchMouseEvent",
      { ...base, type: "mousePressed", buttons: 1 },
      sessionId
    );
    await cdp.send("Input.dispatchMouseEvent", { ...base, type: "mouseReleased" }, sessionId);
    log(`clicked ${what}`);
    await settle();
  };

  /** A real keypress at the browser level — Escape has to reach the dialog's
   *  close-watcher, which a synthetic DOM event would never touch. */
  const press = async (key) => {
    const code = KEYS[key];
    if (code == null) throw new Error(`no virtual key code for ${key}`);
    const base = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
    await cdp.send("Input.dispatchKeyEvent", { ...base, type: "rawKeyDown" }, sessionId);
    await cdp.send("Input.dispatchKeyEvent", { ...base, type: "keyUp" }, sessionId);
    log(`pressed ${key}`);
    await settle();
  };

  /**
   * Scroll the window to `y` and REFUSE TO CONTINUE unless it got there.
   *
   * 🔑 THE ARRIVAL CHECK IS THE REASON THIS EXISTS. `app.css` sets
   * `html { scroll-behavior: smooth }`, and the two-argument `scrollTo(0, y)`
   * obeys it — so a sweep that scrolls and reads two frames later measures the
   * position it started from. Measured 2026-09-07: `scrollTo(0, 5000)` left
   * `scrollY` at **2**, and 238 swept "positions" were nearly all the same
   * position. ⚠️ It produced the CORRECT ANSWER anyway, so nothing in the
   * output invited a second look; it was caught only by printing `scrollY`.
   * Passing `behavior: "instant"` fixes the scroll and proves nothing, which
   * is why the assertion is here rather than a comment saying to remember.
   *
   * Clamped against the document's own maximum, because asking for 6000 on a
   * 4000 px page is a legitimate way to say "the bottom".
   */
  const scrollTo = async (y) => {
    const at = await evalPage(`(() => {
      window.scrollTo({ top: ${Number(y)}, left: 0, behavior: "instant" });
      return { y: window.scrollY, max: document.documentElement.scrollHeight - innerHeight };
    })()`);
    const wanted = Math.min(Number(y), Math.max(0, at.max));
    if (Math.abs(at.y - wanted) > 2) {
      throw new UnstableElementError(
        `${UNSTABLE_TAG} the page was sent to y=${wanted} and stopped at y=${at.y}.` +
          ` A scroll that does not arrive makes every measurement after it a` +
          ` measurement of somewhere else.`
      );
    }
    await settle();
    log(`scrolled to ${at.y}`);
    return at.y;
  };

  return { evalPage, settle, click, press, scrollTo };
}
