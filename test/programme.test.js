import { at, session, dbWith } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { EX, FULL, ARCHIVED } from "../js/config.js";
import { newSession, packValue } from "../js/store.js";
import { targetFor } from "../js/targets.js";
import { lifetime, tonnage, tut, milestones } from "../js/milestones.js";
import { chartData, chartHtml, switchAt } from "../js/chart.js";

const NOW = at(2026, 6, 1);
const rest = { pushup: [10, 8, 6], squat: [12, 10, 8], pike: [6, 5, 4], bridge: [6, 6, 6], situp: [15, 12, 10], plank: [30, 30, 30] };
const withPack = (date, log, pack) => ({ ...newSession(date.getTime(), log, pack) });

/* Ten synthetic sessions with inverted rows, enough for the first row milestones. */
function rowEra() {
  return Array.from({ length: 10 }, (_, i) => session(at(2026, 3, 2 + i * 3, 7), { ...rest, row: [8, 6, 4] }));
}

test("programme: backpack rows replace inverted rows in second place; rows are archived", () => {
  assert.deepEqual(FULL, ["pushup", "packrow", "squat", "pike", "bridge", "situp", "plank"]);
  assert.deepEqual(ARCHIVED, ["row"]);
  assert.equal(EX.row.replacedBy, "packrow");
  assert.equal(EX.packrow.sides, 2);
  assert.equal(EX.packrow.per, "per arm");
});

test("programme: archived rows keep counting toward lifetime, load, time and milestones", () => {
  const before = dbWith(rowEra(), { bw: 80, pack: 10 });
  const after = dbWith(rowEra().concat(withPack(at(2026, 5, 1, 7), { ...rest, packrow: [10, 8, 6] }, 10)), { bw: 80, pack: 10 });
  assert.equal(lifetime(before, "row"), 180);
  assert.equal(lifetime(after, "row"), 180);
  assert.ok(tonnage(after) > tonnage(before));
  assert.ok(tut(after) > tut(before));
  const got = db => milestones(db, NOW).filter(m => m.got).map(m => m.k);
  assert.ok(got(before).includes("r-row-100"));
  for (const k of got(before)) assert.ok(got(after).includes(k), k);
});

test("programme: backpack rows start without a target", () => {
  const db = dbWith(rowEra());
  assert.equal(targetFor(db, "packrow", 0), null);
  db.sessions.push(withPack(at(2026, 5, 1, 7), { packrow: [10, 8, 6] }, 10));
  assert.deepEqual([0, 1, 2].map(i => targetFor(db, "packrow", i)), [11, 9, 7]);
});

test("newSession: the pack weight is saved only when backpack rows were done", () => {
  const ts = at(2026, 5, 1, 7).getTime();
  assert.deepEqual(newSession(ts, { packrow: [5, 4, 3] }, 12.5), { id: ts, ts, log: { packrow: [5, 4, 3] }, pack: 12.5 });
  assert.deepEqual(newSession(ts, { pushup: [5, 4, 3] }, 12.5), { id: ts, ts, log: { pushup: [5, 4, 3] } });
  assert.deepEqual(newSession(ts, { packrow: [5, 4, 3] }, null), { id: ts, ts, log: { packrow: [5, 4, 3] } });
});

test("packValue: kilograms from 0.5 to 50", () => {
  assert.equal(packValue("12.5"), 12.5);
  assert.equal(packValue(0.5), 0.5);
  assert.equal(packValue(50), 50);
  for (const bad of ["", "0", "0.4", "51", "-3", "abc"]) assert.equal(packValue(bad), null, bad);
});

test("tonnage: backpack rows use each session's own pack weight, both arms", () => {
  const db = dbWith([
    withPack(at(2026, 5, 1, 7), { packrow: [10, 8, 6] }, 10),
    withPack(at(2026, 5, 4, 7), { packrow: [10, 8, 6] }, 12),
    session(at(2026, 5, 7, 7), { packrow: [10, 8, 6] })            // no pack weight: adds nothing
  ], { bw: 80, pack: 20 });
  assert.equal(tonnage(db), 24 * 2 * 10 + 24 * 2 * 12);
  db.pack = 5;                                                    // a later setting change
  assert.equal(tonnage(db), 24 * 2 * 10 + 24 * 2 * 12);
  assert.equal(tonnage({ ...db, bw: null }), null);
  assert.equal(lifetime(db, "packrow"), 144);
  assert.equal(tut(db), 144 * 3);
});

test("chartData: logged rows fill the backpack slot, so only real skips are hollow", () => {
  const { pike, ...noPike } = rest;
  const db = dbWith([
    session(at(2026, 3, 2, 7), { ...rest, row: [8, 6, 4] }),
    session(at(2026, 3, 4, 7), { ...rest }),                           // rows skipped
    session(at(2026, 3, 6, 7), { ...noPike, row: [8, 6, 4] }),         // pike skipped
    withPack(at(2026, 3, 9, 7), { ...rest, packrow: [10, 8, 6] }, 10),
    session(at(2026, 3, 11, 7), { ...rest })                           // backpack rows skipped
  ]);
  assert.deepEqual(chartData(db, "__vol", "total").hollow, [false, true, true, false, true]);
});

test("switchAt: the programme-change line waits for a session after the last rows", () => {
  const rows = rowEra();
  assert.equal(switchAt(dbWith(rows)), null);
  assert.equal(chartData(dbWith(rows), "__vol", "total").switchAt, null);
  const line = html => (html.match(/stroke-dasharray="2 3"/g) || []).length;
  assert.equal(line(chartHtml(dbWith(rows), "__vol", "total", 320)), 0);
  const db = dbWith(rows.concat(withPack(at(2026, 5, 1, 7), { ...rest, packrow: [10, 8, 6] }, 10)));
  assert.equal(switchAt(db), 9.5);
  assert.equal(line(chartHtml(db, "__vol", "total", 320)), 1);
  assert.equal(line(chartHtml(db, "pushup", "total", 320)), 0);
  assert.equal(switchAt(dbWith([])), null);
});
