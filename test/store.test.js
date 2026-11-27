import { at, dbWith } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, blank, parseImport, exportJson, OLD_FILE, BAD_FILE, KEY } from "../js/store.js";

test("store: the storage key does not depend on the app's name", () => {
  assert.equal(KEY, "workouts.v2");
});

test("newSession: a session holds id, ts and the exercises that were done", () => {
  const ts = at(2026, 3, 2, 7).getTime();
  const log = { pushup: [5, 4, 3] };
  assert.deepEqual(newSession(ts, log), { id: ts, ts, log });
});

test("blank: a new database is v2 with the default plank target", () => {
  assert.deepEqual(blank(), { v: 2, bw: null, sessions: [], commits: {}, targets: { plank: 30 } });
});

test("parseImport: accepts a v2 export and round-trips it", () => {
  const ts = at(2026, 3, 2, 7).getTime();
  const db = dbWith([newSession(ts, { squat: [9, 8, 7] })], { bw: 70, targets: { bridge: 6, plank: 35 } });
  assert.deepEqual(parseImport(exportJson(db)), db);
});

test("parseImport: a v2 file without a plank target gets the default", () => {
  const db = parseImport(JSON.stringify({ v: 2, sessions: [], targets: { bridge: 4 } }));
  assert.deepEqual(db.targets, { bridge: 4, plank: 30 });
});

test("parseImport: rejects a v1 export as the old version", () => {
  const v1 = { v: 1, bw: 70, sessions: [{ id: 1, ts: 1, type: "full", credit: 1, log: {} }],
               commits: {}, caps: { bridge: 3 }, seen: [] };
  assert.throws(() => parseImport(JSON.stringify(v1)), { message: OLD_FILE });
});

test("parseImport: rejects anything that is not a v2 export", () => {
  const bad = ["not json", "null", "[]", "{}", JSON.stringify({ sessions: [] }),
               JSON.stringify({ v: 3, sessions: [] }),
               JSON.stringify({ v: 2 }),
               JSON.stringify({ v: 2, sessions: {} }),
               JSON.stringify({ v: 2, sessions: [{ log: {} }] }),
               JSON.stringify({ v: 2, sessions: [{ ts: 1 }] })];
  for (const text of bad) assert.throws(() => parseImport(text), { message: BAD_FILE }, text);
});
