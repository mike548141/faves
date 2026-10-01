// A Durable Object namespace stand-in for `node --test` and the browser checks
// (roadmap 510/340). Test support only: wrangler bundles what sync-worker.js
// imports, and it imports nothing, so this file is never deployed.
//
// THE BAR: AT LEAST AS STRICT AS CLOUDFLARE, NEVER MORE FORGIVING. A stand-in
// that forgives what the real platform punishes is how a check goes green on
// the fault it exists to find (the 2026-08-17 CORS lesson: a permissive fake
// passed while the deployed Worker could not take a second write). So:
//
//   · ONE INSTANCE PER NAME, ONE STORAGE PER NAME. `idFromName` is a pure
//     function of the name; every stub for it reaches the same instance, and
//     the instance's storage outlives it (`evict` drops the instance, keeps
//     the rows, as the platform does after an idle spell).
//   · STORAGE IS REAL SQLITE (`node:sqlite`, built into Node — no dependency),
//     synchronous, and a read always sees the latest write: the same contract
//     as `ctx.storage.sql`. `transactionSync` is a real SQLite transaction that
//     rolls back if the callback throws. Like Cloudflare, `exec` refuses
//     BEGIN/COMMIT/SAVEPOINT (transactions go through `transactionSync`), and
//     — STRICTER — it refuses more than one statement per call, and refuses a
//     binding that is not a string, number, null or ArrayBuffer (a Uint8Array
//     view is refused: the documented binding type is ArrayBuffer). BLOBs come
//     back as ArrayBuffer, as on Cloudflare.
//   · CONCURRENCY IS STRICTER THAN THE PLATFORM. Cloudflare's input gates hold
//     new events back while storage operations are in flight; this stand-in
//     has no gates at all, so concurrent requests interleave at EVERY await,
//     including a bare `await` of nothing. Code that is correct here does not
//     lean on the gates. (The CAS in SyncStore is synchronous for exactly this
//     reason, and the break-probe that adds one await to it fails here.)
//
// WHERE IT IS MORE PERMISSIVE — said plainly, because these are the gaps a
// green run here cannot speak to:
//
//   · No output gates and no durability: a write is "committed" the moment the
//     statement returns. A real object can fail to persist (and then resets);
//     nothing here models that.
//   · Alarms never fire on their own. A test calls `runAlarm(name)` after moving
//     the clock. Cloudflare's at-least-once delivery and retry-on-throw are not
//     modelled.
//   · No limits: request size, CPU time, storage size, rows per day.
//   · No eviction mid-request, and no instance restart after an exception.
//   · `deleteAll()` here deletes every table and leaves the alarm alone (code
//     must delete the alarm itself, which SyncStore does) — the conservative
//     reading of the platform's documented behaviour.

import { DatabaseSync } from "node:sqlite";

class StandInId {
  constructor(name) {
    this.name = name;
    // Real ids are 64 hex characters; this one only has to be stable and unique.
    this.hex = Buffer.from(name).toString("hex");
  }
  equals(other) {
    return other instanceof StandInId && other.hex === this.hex;
  }
  toString() {
    return this.hex;
  }
}

const CONTROL = /^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|END)\b/i;

function bind(v) {
  if (v === null || typeof v === "string" || typeof v === "number") return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  throw new TypeError(`unsupported SQL binding: ${Object.prototype.toString.call(v)}`);
}

function unbind(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Uint8Array ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v;
  }
  return out;
}

class StandInStorage {
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.alarm = null;
    this.rowsRead = 0;
    this.rowsWritten = 0;
    // Statements, not rows: a lookup that finds nothing returns no row but is
    // still a read the object made (chatty_check counts these).
    this.selects = 0;
    this.inTxn = false;
    const self = this;
    this.sql = {
      exec(query, ...bindings) {
        if (CONTROL.test(query)) throw new Error("use transactionSync(), not a transaction statement");
        if (/;\s*\S/.test(query)) throw new Error("one statement per exec() in this stand-in");
        const stmt = self.db.prepare(query);
        const args = bindings.map(bind);
        let rows;
        if (/^\s*(SELECT|WITH)\b/i.test(query)) {
          rows = stmt.all(...args).map(unbind);
          self.rowsRead += rows.length;
          self.selects += 1;
        } else {
          const r = stmt.run(...args);
          self.rowsWritten += Number(r.changes || 0);
          rows = [];
        }
        return {
          toArray: () => rows,
          one: () => {
            if (rows.length !== 1) throw new Error(`expected exactly one row, got ${rows.length}`);
            return rows[0];
          },
          [Symbol.iterator]: () => rows[Symbol.iterator](),
        };
      },
    };
  }
  transactionSync(fn) {
    if (this.inTxn) return fn();
    this.db.exec("BEGIN");
    this.inTxn = true;
    try {
      const r = fn();
      if (r && typeof r.then === "function") throw new Error("transactionSync callback must be synchronous");
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    } finally {
      this.inTxn = false;
    }
  }
  async getAlarm() {
    return this.alarm;
  }
  async setAlarm(ms) {
    this.alarm = Number(ms instanceof Date ? ms.getTime() : ms);
  }
  async deleteAlarm() {
    this.alarm = null;
  }
  async deleteAll() {
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    for (const { name } of tables) this.db.exec(`DROP TABLE "${name}"`);
  }
  /** Test helper: every row of a table, or [] if it does not exist. */
  dump(table) {
    const has = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").all(table);
    return has.length ? this.db.prepare(`SELECT * FROM "${table}"`).all().map(unbind) : [];
  }
}

/**
 * `new DurableObjectNamespaceStandIn(SyncStore, (name) => envForObject)` →
 * a binding usable as `env.SYNC_STORE`. `env` is a function so the object can
 * see a different KV location from the Worker (an object lives in one place).
 * `now`, if given, is installed as each instance's clock (seconds).
 */
export class DurableObjectNamespaceStandIn {
  constructor(ObjectClass, env, { now = null } = {}) {
    this.ObjectClass = ObjectClass;
    this.env = env;
    this.now = now;
    this.instances = new Map();
    this.storages = new Map();
    this.requests = 0;
  }
  idFromName(name) {
    return new StandInId(String(name));
  }
  storage(name) {
    const hex = this.idFromName(name).hex;
    if (!this.storages.has(hex)) this.storages.set(hex, new StandInStorage());
    return this.storages.get(hex);
  }
  instance(id) {
    let obj = this.instances.get(id.hex);
    if (!obj) {
      if (!this.storages.has(id.hex)) this.storages.set(id.hex, new StandInStorage());
      const storage = this.storages.get(id.hex);
      const ctx = {
        id,
        storage,
        // Present for completeness; SyncStore does not need it.
        blockConcurrencyWhile: async (fn) => fn(),
      };
      const env = typeof this.env === "function" ? this.env(id.name) : this.env;
      obj = new this.ObjectClass(ctx, { ...env, SYNC_STORE: this });
      if (this.now) obj.nowSeconds = this.now;
      this.instances.set(id.hex, obj);
    }
    return obj;
  }
  get(id) {
    return {
      id,
      fetch: async (input, init) => {
        this.requests += 1;
        const req = input instanceof Request ? input : new Request(input, init);
        // A hop: the request is delivered on a later turn, so anything already
        // running in the object gets to its next await first.
        await Promise.resolve();
        return this.instance(id).fetch(req);
      },
    };
  }
  /** Drop the instance (an idle eviction). Its storage stays. */
  evict(name) {
    this.instances.delete(this.idFromName(name).hex);
  }
  /** Fire the alarm for `name` if one is set at or before `atMs`. */
  async runAlarm(name, atMs = Infinity) {
    const st = this.storage(name);
    if (st.alarm === null || st.alarm > atMs) return false;
    st.alarm = null;
    await this.instance(this.idFromName(name)).alarm();
    return true;
  }
  /** Totals across every object: rows a SELECT returned, SELECT statements
   *  run, and rows a write changed. */
  counts() {
    const out = { rowsRead: 0, selects: 0, rowsWritten: 0 };
    for (const s of this.storages.values()) {
      out.rowsRead += s.rowsRead;
      out.selects += s.selects;
      out.rowsWritten += s.rowsWritten;
    }
    return out;
  }
}
