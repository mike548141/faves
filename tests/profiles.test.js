// Unit tests for the device-local profiles model (site/js/profiles.js) — the
// registry, key namespacing, migration of pre-profiles data, and delete/purge.
// Storage is faked; pure otherwise. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROFILES_KEY,
  SCOPED_BASE_KEYS,
  scopeKey,
  sanitiseName,
  sanitiseRegistry,
  migrate,
  createProfiles,
  reloadProfileStores,
} from "../site/js/profiles.js";

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m, // test-only peek
  };
}

// --- scopeKey ---------------------------------------------------------

test("scopeKey namespaces a base key by profile id, stripping the faves. prefix", () => {
  assert.equal(scopeKey("default", "faves.favourites.v1"), "faves.p.default.favourites.v1");
  assert.equal(scopeKey("pXY", "faves.settings.v1"), "faves.p.pXY.settings.v1");
});

test("scopeKey leaves a non-faves base key intact", () => {
  assert.equal(scopeKey("a", "custom.key"), "faves.p.a.custom.key");
});

test("two profiles get disjoint keys for the same base", () => {
  const base = "faves.favourites.v1";
  assert.notEqual(scopeKey("a", base), scopeKey("b", base));
});

// --- sanitiseName -----------------------------------------------------

test("sanitiseName trims, collapses whitespace, caps length", () => {
  assert.equal(sanitiseName("  Sam  "), "Sam");
  assert.equal(sanitiseName("Anne   Marie"), "Anne Marie");
  assert.equal(sanitiseName("x".repeat(50)).length, 24);
  assert.equal(sanitiseName("   "), "");
  assert.equal(sanitiseName(null), "");
  assert.equal(sanitiseName(undefined), "");
});

// --- sanitiseRegistry -------------------------------------------------

test("sanitiseRegistry: empty/garbage → a single default profile", () => {
  for (const bad of [null, {}, { profiles: "nope" }, { profiles: [] }, { profiles: [{ id: "", name: "x" }] }]) {
    const r = sanitiseRegistry(bad);
    assert.equal(r.profiles.length, 1);
    assert.equal(r.activeId, r.profiles[0].id);
  }
});

test("sanitiseRegistry drops nameless/idless/duplicate profiles and repairs activeId", () => {
  const r = sanitiseRegistry({
    activeId: "ghost",
    profiles: [
      { id: "a", name: "Ann" },
      { id: "a", name: "Dup" }, // duplicate id dropped
      { id: "b", name: "   " }, // empty name dropped
      { id: "", name: "NoId" }, // empty id dropped
      { id: "c", name: "Cai" },
    ],
  });
  assert.deepEqual(r.profiles.map((p) => p.id), ["a", "c"]);
  assert.equal(r.activeId, "a"); // ghost activeId repaired to the first real one
});

test("sanitiseRegistry keeps a valid activeId", () => {
  const r = sanitiseRegistry({ activeId: "c", profiles: [{ id: "a", name: "A" }, { id: "c", name: "C" }] });
  assert.equal(r.activeId, "c");
});

// --- migration --------------------------------------------------------

test("migrate on a fresh device creates a default profile with no old data", () => {
  const s = fakeStorage();
  const reg = migrate(s);
  assert.equal(reg.activeId, "default");
  assert.equal(reg.profiles[0].id, "default");
  assert.ok(s.getItem(PROFILES_KEY)); // persisted
});

test("migrate folds pre-profiles favourites + settings into the default profile (copy, not move)", () => {
  const s = fakeStorage({
    "faves.favourites.v1": '[{"type":"venue","venueId":"x"}]',
    "faves.settings.v1": '{"lang":"mi"}',
  });
  migrate(s);
  // Copied to the default profile's namespaced keys...
  assert.equal(s.getItem("faves.p.default.favourites.v1"), '[{"type":"venue","venueId":"x"}]');
  assert.equal(s.getItem("faves.p.default.settings.v1"), '{"lang":"mi"}');
  // ...and the old keys are LEFT in place (a stale cached asset still reads them).
  assert.equal(s.getItem("faves.favourites.v1"), '[{"type":"venue","venueId":"x"}]');
});

test("migrate is idempotent — a second run never resurrects or clobbers", () => {
  const s = fakeStorage({ "faves.favourites.v1": '["old"]' });
  migrate(s);
  // Simulate the active profile editing its (now namespaced) favourites.
  s.setItem("faves.p.default.favourites.v1", '["edited"]');
  migrate(s); // second boot
  assert.equal(s.getItem("faves.p.default.favourites.v1"), '["edited"]'); // not clobbered
});

test("migrate does not overwrite an existing registry or active choice", () => {
  const s = fakeStorage();
  const p = createProfiles(s);
  const id = p.create("Alex"); // now two profiles, Alex active
  assert.equal(migrate(s).activeId, id); // migrate is a no-op over a live registry
  assert.equal(sanitiseRegistry(JSON.parse(s.getItem(PROFILES_KEY))).activeId, id);
});

test("migrate copies only when the target is empty (no clobber of newer data)", () => {
  const s = fakeStorage({
    "faves.favourites.v1": '["old"]',
    "faves.p.default.favourites.v1": '["already-there"]',
  });
  migrate(s);
  assert.equal(s.getItem("faves.p.default.favourites.v1"), '["already-there"]');
});

// --- createProfiles: lifecycle ---------------------------------------

test("a fresh store exposes one active default profile", () => {
  const p = createProfiles(fakeStorage());
  assert.equal(p.list().length, 1);
  assert.equal(p.active().id, "default");
  assert.equal(p.activeId(), "default");
});

test("create adds a profile, switches to it, and persists", () => {
  const s = fakeStorage();
  const p = createProfiles(s);
  const id = p.create("Sam");
  assert.ok(id);
  assert.equal(p.list().length, 2);
  assert.equal(p.activeId(), id); // creating switches to the new person
  // Re-hydrates from the same storage.
  assert.equal(createProfiles(s).activeId(), id);
});

test("create rejects an empty name", () => {
  const p = createProfiles(fakeStorage());
  assert.equal(p.create("   "), null);
  assert.equal(p.list().length, 1);
});

test("rename changes a profile's name; unknown id or empty name is rejected", () => {
  const p = createProfiles(fakeStorage());
  assert.equal(p.rename("default", "Jo"), true);
  assert.equal(p.active().name, "Jo");
  assert.equal(p.rename("nope", "X"), false);
  assert.equal(p.rename("default", "  "), false);
});

test("setActive switches profiles and rejects an unknown id", () => {
  const p = createProfiles(fakeStorage());
  const id = p.create("Alex");
  assert.equal(p.setActive("default"), true);
  assert.equal(p.activeId(), "default");
  assert.equal(p.setActive("ghost"), false);
  assert.equal(p.activeId(), "default");
  assert.equal(p.setActive(id), true);
});

test("scopedKey tracks the active profile", () => {
  const p = createProfiles(fakeStorage());
  const id = p.create("Alex");
  assert.equal(p.scopedKey("faves.favourites.v1"), scopeKey(id, "faves.favourites.v1"));
  p.setActive("default");
  assert.equal(p.scopedKey("faves.favourites.v1"), "faves.p.default.favourites.v1");
});

// --- delete + purge ---------------------------------------------------

test("remove deletes a profile and purges its per-profile data", () => {
  const s = fakeStorage();
  const p = createProfiles(s);
  const id = p.create("Sam");
  // Sam is active; write some of Sam's data under the namespaced keys.
  for (const base of SCOPED_BASE_KEYS) s.setItem(scopeKey(id, base), '["samdata"]');
  p.setActive("default");
  assert.equal(p.remove(id), true);
  assert.equal(p.list().length, 1);
  for (const base of SCOPED_BASE_KEYS) assert.equal(s.getItem(scopeKey(id, base)), null);
});

test("removing the active profile hands active to the first remaining", () => {
  const p = createProfiles(fakeStorage());
  const id = p.create("Sam"); // Sam active
  assert.equal(p.remove(id), true);
  assert.equal(p.activeId(), "default");
});

test("the last profile can never be deleted", () => {
  const p = createProfiles(fakeStorage());
  assert.equal(p.remove("default"), false);
  assert.equal(p.list().length, 1);
});

test("remove rejects an unknown id", () => {
  const p = createProfiles(fakeStorage());
  p.create("Alex");
  assert.equal(p.remove("ghost"), false);
  assert.equal(p.list().length, 2);
});

// --- namespacing isolation (the point of the whole exercise) ----------

test("two profiles keep disjoint favourites under the same base key", () => {
  const s = fakeStorage();
  const p = createProfiles(s);
  const base = "faves.favourites.v1";
  // Default profile hearts one thing.
  s.setItem(p.scopedKey(base), '["default-fav"]');
  const id = p.create("Alex"); // switches active to Alex
  s.setItem(p.scopedKey(base), '["alex-fav"]');
  p.setActive("default");
  assert.equal(s.getItem(p.scopedKey(base)), '["default-fav"]');
  p.setActive(id);
  assert.equal(s.getItem(p.scopedKey(base)), '["alex-fav"]');
});

// --- subscribe --------------------------------------------------------

test("subscribe fires on change; unsubscribe stops it", () => {
  const p = createProfiles(fakeStorage());
  let calls = 0;
  const off = p.subscribe(() => calls++);
  p.create("Alex");
  assert.equal(calls, 1);
  p.setActive("default");
  assert.equal(calls, 2);
  off();
  p.create("Sam");
  assert.equal(calls, 2);
});

test("reload re-reads the registry (cross-tab switch) and notifies", () => {
  const s = fakeStorage();
  const p = createProfiles(s);
  const id = p.create("Alex");
  p.setActive("default");
  // Another tab switches to Alex by writing the registry directly.
  s.setItem(PROFILES_KEY, JSON.stringify({ v: 1, activeId: id, profiles: [{ id: "default", name: "Me" }, { id, name: "Alex" }] }));
  let notified = false;
  p.subscribe(() => (notified = true));
  p.reload();
  assert.equal(p.activeId(), id);
  assert.equal(notified, true);
});

// --- reloadProfileStores: the profile-switch safety contract ---------
// The menu screen re-points every per-profile store on a switch. ORDER is
// load-bearing: settings.reload() drives the safety re-render via its
// subscription, so it must run LAST — after favourites/ratings are already the
// new person's — or the rebuilt menu shows the previous profile's data. This is
// exactly the race the adversarial review caught (first render baking in a stale
// allergen filter), so the ordering is pinned here.
test("reloadProfileStores reloads favourites & ratings BEFORE settings (settings drives the repaint)", () => {
  const calls = [];
  const store = (name) => ({ reload: () => calls.push(name) });
  reloadProfileStores({ favourites: store("favourites"), ratings: store("ratings"), settings: store("settings") });
  assert.deepEqual(calls, ["favourites", "ratings", "settings"]);
  assert.equal(calls.at(-1), "settings", "settings must reload last — its subscribers repaint the menu");
});

test("reloadProfileStores tolerates a missing ratings store (the recipe screen has none)", () => {
  const calls = [];
  const store = (name) => ({ reload: () => calls.push(name) });
  reloadProfileStores({ favourites: store("favourites"), settings: store("settings") });
  assert.deepEqual(calls, ["favourites", "settings"]);
});
