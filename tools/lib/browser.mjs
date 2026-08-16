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
// WHAT IT OWNS ON BEHALF OF ALL TEN CHECKS, added 2026-08-17 — each of these is
// here rather than in the tools because each is a way a check can lie, and a
// tool that can forget to guard against it will:
//   · reaping its own Chrome and profile directory on abnormal exit, and
//     sweeping the orphans left by runs no handler could catch;
//   · the verdict line, so every run states the TREE and SHELL_VERSION it was
//     measured against — a session once verified against a tree that did not
//     contain its change, and the run was green;
//   · classifying a CDP transport failure as a HARNESS error, so "the browser
//     stopped answering" can never print as `FAIL <assertion name>`.

import { execFileSync, spawn } from "node:child_process";
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

export function startServer(port, siteDir) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
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
    server.listen(port, "127.0.0.1", () => res({ server, port: server.address().port }));
  });
}

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
// the one funnel every assertion in all ten tools passes through.

/** Latched, not passed: the tools catch broadly by design, so the fact that the
 *  transport died has to survive being caught and discarded. */
let transportBroken = null;

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

/** Poll `fn` until it returns truthy, or give up. Returns the truthy value. */
export async function until(fn, { label, timeout = 15_000, step = 100 }) {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    last = await fn();
    if (last) return last;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(step);
  }
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
  process.on("uncaughtException", (err) => {
    // Print it and exit non-zero. A harness that eats an exception and exits 0
    // reads as a pass, which is the one outcome worse than a leaked browser.
    // Exit 2 is this repo's "harness error", distinct from 1 = assertions
    // failed — the tools' own top-level catches already use it.
    if (err instanceof HarnessError) abortAsHarnessError("an unguarded step");
    console.error(err);
    process.exit(2);
  });
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
    // The funnel. Every assertion in all ten tools comes through here, so this
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
   * WHY IT LIVES HERE. Until 2026-08-17 all ten checks hand-rolled this line
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
      // "instant" is load-bearing: the site sets scroll-behavior: smooth (for
      // readers who haven't asked for reduced motion), so a plain
      // scrollIntoView returns before the page has moved and the rect read
      // straight after is the pre-scroll one — a click into empty space for
      // anything far down the page.
      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
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

  return { evalPage, settle, click, press };
}
