// The Chrome LAUNCH retry (ADR 0160, roadmap 510/420): a Chrome that never
// writes its DevTools port file is started once more, loudly, and no more than
// once.
//
// 🔑 NO REAL CHROME. The behaviour under test is `launchChrome`'s handling of a
// process that does or does not write `DevToolsActivePort`, so the "browser" is
// a shell script that does exactly that and nothing else. That makes the test
// fast, deterministic, and runnable in the unit-test job, which installs no
// browser — and it means the failure is FORCED rather than waited for: CI saw
// it three times in two weeks and a developer machine never.
//
// Each case runs `launchChrome` in a CHILD node process because browser.mjs
// reads FAVES_CHROME and FAVES_LAUNCH_TIMEOUT_MS once, at import.
//
// 🚩 WHAT A GREEN RUN HERE CANNOT SHOW: that a real Chrome which timed out once
// starts on its second go. That is the bet the retry makes, and it rests on the
// three CI occurrences having all been green on re-run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BROWSER = fileURLToPath(new URL("../tools/lib/browser.mjs", import.meta.url));

const FAKE_CHROME = `#!/bin/sh
for a in "$@"; do case "$a" in --user-data-dir=*) dir="\${a#--user-data-dir=}";; esac; done
n=$(cat "$FAKE_STATE/count" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$FAKE_STATE/count"
# A leftover from the previous attempt still in the profile means it was not emptied.
[ -e "$dir/stale-marker" ] && echo stale >> "$FAKE_STATE/stale-seen"
if [ "$n" -le "$FAKE_HANG_FIRST" ]; then touch "$dir/stale-marker"; exec sleep 30; fi
printf '9222\\n/devtools/browser/fake\\n' > "$dir/DevToolsActivePort"
exec sleep 30
`;

const CHILD = `
import { launchChrome, stopChrome } from ${JSON.stringify("file://" + BROWSER)};
try {
  const c = await launchChrome({ profileDir: process.env.FAKE_PROFILE, headed: false });
  console.log("RESULT " + c.wsUrl);
  await stopChrome(c.proc, { keepProfile: true });
  process.exit(0);
} catch (e) {
  console.log("REJECTED " + e.message);
  process.exit(2);
}
`;

/** Run launchChrome against a fake Chrome that hangs on its first `hangFirst` starts. */
function run(hangFirst) {
  const dir = mkdtempSync(join(tmpdir(), "faves-launch-retry-test-"));
  try {
    const chrome = join(dir, "fake-chrome.sh");
    writeFileSync(chrome, FAKE_CHROME);
    chmodSync(chrome, 0o755);
    const state = join(dir, "state");
    const profile = join(dir, "profile");
    for (const d of [state, profile]) spawnSync("mkdir", ["-p", d]);
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", CHILD], {
      encoding: "utf8",
      env: {
        ...process.env,
        FAVES_CHROME: chrome,
        // 5 s, not 1.5: a fake that WRITES its port file must beat this even on a
        // loaded machine (child node + sh startup missed 1.5 s at load ~158 on
        // 2026-10-16, failing the cases that should succeed), and a fake that
        // HANGS never writes at all, so the wait costs only time, never a verdict.
        FAVES_LAUNCH_TIMEOUT_MS: "5000",
        FAVES_NO_SWEEP: "1",
        GITHUB_ACTIONS: "",
        FAKE_STATE: state,
        FAKE_PROFILE: profile,
        FAKE_HANG_FIRST: String(hangFirst),
      },
      timeout: 30_000,
    });
    const read = (f) => (existsSync(join(state, f)) ? readFileSync(join(state, f), "utf8").trim() : "");
    return { out: r.stdout, err: r.stderr, launches: Number(read("count") || 0), stale: read("stale-seen") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("control: a Chrome that starts first time is launched once and nothing is announced", () => {
  const r = run(0);
  assert.match(r.out, /RESULT ws:\/\/127\.0\.0\.1:9222\/devtools\/browser\/fake/);
  assert.equal(r.launches, 1);
  // Without this a retry that fires every time would pass the next case too.
  assert.doesNotMatch(r.out, /↻/);
});

test("a Chrome that hangs once is started again, on an emptied profile, and says so", () => {
  const r = run(1);
  assert.match(r.out, /RESULT ws:\/\/127\.0\.0\.1:9222\/devtools\/browser\/fake/, r.out + r.err);
  assert.equal(r.launches, 2, "exactly one retry");
  assert.match(r.out, /↻ LAUNCH RETRY/);
  assert.match(r.out, /↻ THE LAUNCH RETRY WORKED/);
  assert.equal(r.stale, "", "the second Chrome saw the first one's profile contents");
});

test("a Chrome that hangs twice is tried twice and the failure still surfaces", () => {
  const r = run(99);
  assert.match(r.out, /REJECTED timed out waiting for Chrome's DevToolsActivePort/, r.out + r.err);
  assert.equal(r.launches, 2, "bounded: one retry, not a loop");
  assert.match(r.out, /↻ THE LAUNCH RETRY FAILED TOO/);
});

test("a missing Chrome binary is not retried", () => {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", CHILD], {
    encoding: "utf8",
    env: { ...process.env, FAVES_CHROME: "/nonexistent/chrome", FAVES_NO_SWEEP: "1", FAKE_PROFILE: tmpdir() },
    timeout: 30_000,
  });
  assert.match(r.stdout, /REJECTED Google Chrome not found/);
  assert.doesNotMatch(r.stdout, /↻/);
});
