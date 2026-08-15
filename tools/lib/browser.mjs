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

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

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

// --- Chrome ------------------------------------------------------------

export async function launchChrome({ profileDir, headed, width = 390, height = 844 }) {
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
    `--window-size=${width},${height}`,
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

export async function stopChrome(proc) {
  if (!proc || proc.exitCode != null) return;
  proc.kill("SIGTERM");
  const gone = await Promise.race([
    new Promise((r) => proc.once("exit", () => r(true))),
    sleep(3000).then(() => false),
  ]);
  if (!gone) proc.kill("SIGKILL");
}

// --- The verdict --------------------------------------------------------

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
