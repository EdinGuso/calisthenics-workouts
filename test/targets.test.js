import { at, session, dbWith, fixture } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { history, targetFor, needsFeedback, nextBridgeTarget, clampPlank, holdSeconds, plankSetValue } from "../js/targets.js";
import { chartData } from "../js/chart.js";
import { lifetime } from "../js/milestones.js";

test("history: chronological entries for one exercise, skipping sessions without it", () => {
  const db = dbWith([
    session(at(2026, 3, 2, 7), { pushup: [5, 4, 3] }),
    session(at(2026, 3, 4, 7), { squat: [9, 8, 7] }),
    session(at(2026, 3, 6, 7), { pushup: [6, 5, 4] })
  ]);
  assert.deepEqual(history(db, "pushup").map(h => h.vals), [[5, 4, 3], [6, 5, 4]]);
  assert.deepEqual(history(db, "pushup")[0], { ts: db.sessions[0].ts, vals: [5, 4, 3] });
});

test("targetFor (failure): no history means no target", () => {
  assert.equal(targetFor(dbWith([]), "pushup", 0), null);
});

test("targetFor (failure): max of the last three sessions at that set position, plus one", () => {
  const db = fixture();
  assert.equal(targetFor(db, "pushup", 0), 18);
  assert.equal(targetFor(db, "pushup", 1), 13);
  assert.equal(targetFor(db, "pushup", 2), 9);
  assert.equal(targetFor(db, "row", 0), 12);
  assert.equal(targetFor(db, "squat", 0), 31);
  assert.equal(targetFor(db, "situp", 2), 11);
});

test("targetFor (failure): older sessions do not count, fewer than three is fine", () => {
  const db = dbWith([
    session(at(2026, 3, 2, 7), { pushup: [30, 4, 3] }),
    session(at(2026, 3, 4, 7), { pushup: [10, 4, 3] }),
    session(at(2026, 3, 6, 7), { pushup: [12, 4, 3] }),
    session(at(2026, 3, 8, 7), { pushup: [11, 4, 3] })
  ]);
  assert.equal(targetFor(db, "pushup", 0), 13);
  assert.equal(targetFor(dbWith(db.sessions.slice(0, 1)), "pushup", 0), 31);
});

test("targetFor (failure): an all-zero entry counts as a session", () => {
  const db = dbWith([
    session(at(2026, 3, 2, 7), { row: [9, 5, 3] }),
    session(at(2026, 3, 4, 7), { row: [0, 0, 0] }),
    session(at(2026, 3, 6, 7), { row: [0, 0, 0] }),
    session(at(2026, 3, 8, 7), { row: [0, 0, 0] })
  ]);
  assert.equal(targetFor(db, "row", 0), 1);
});

test("targetFor (capped): the stored target, or none", () => {
  const db = fixture();
  assert.equal(targetFor(db, "bridge", 0), 9);
  assert.equal(targetFor(db, "plank", 2), 30);
  assert.equal(targetFor(dbWith([]), "bridge", 0), null);
  assert.equal(targetFor(dbWith([]), "plank", 0), 30);
});

const bridgeAfter = (target, vals, fb) =>
  nextBridgeTarget(dbWith([], { targets: target == null ? {} : { bridge: target } }), vals, fb);

test("bridge: feedback is asked only when every set met the target", () => {
  const db = t => dbWith([], { targets: t == null ? {} : { bridge: t } });
  assert.equal(needsFeedback(db(7), "bridge", [9, 8, 7]), true);
  assert.equal(needsFeedback(db(7), "bridge", [9, 8, 6]), false);
  assert.equal(needsFeedback(db(null), "bridge", [9, 8, 7]), false);
  assert.equal(needsFeedback(dbWith([]), "plank", [30, 30, 30]), false);
});

test("bridge: all sets met, the target follows the weakest set and the feedback", () => {
  assert.equal(bridgeAfter(3, [9, 8, 7], "easy"), 8);
  assert.equal(bridgeAfter(3, [9, 8, 7], "right"), 7);
  assert.equal(bridgeAfter(3, [9, 8, 7], "hard"), 6);
});

test("bridge: a missed set sets the target to the weakest set, feedback ignored", () => {
  assert.equal(bridgeAfter(10, [10, 9, 7], null), 7);
  assert.equal(bridgeAfter(10, [10, 9, 10], "easy"), 9);
});

test("bridge: the first session sets the target to the weakest set", () => {
  assert.equal(bridgeAfter(null, [8, 7, 4], null), 4);
  assert.equal(bridgeAfter(null, [8, 7, 4], "easy"), 4);
});

test("bridge: the target stays within 1 and 18", () => {
  assert.equal(bridgeAfter(18, [20, 19, 18], "easy"), 18);
  assert.equal(bridgeAfter(17, [25, 25, 25], "right"), 18);
  assert.equal(bridgeAfter(1, [1, 1, 1], "hard"), 1);
  assert.equal(bridgeAfter(5, [0, 0, 0], null), 1);
});

test("bridge: a stuck-low target catches up with what is done", () => {
  // Synthetic: a weak second session pulls it down, then steady sessions well above it.
  let t = null;
  const run = [[[8, 7, 5], null], [[5, 4, 3], null], [[10, 9, 8], "right"],
               [[10, 9, 8], "right"], [[11, 10, 9], "easy"], [[11, 10, 9], "hard"]];
  const seen = run.map(([vals, fb]) => (t = bridgeAfter(t, vals, fb)));
  assert.deepEqual(seen, [5, 3, 8, 8, 10, 9]);
});

test("plank: Settings target moves in 5 s steps between 5 and 60", () => {
  assert.equal(clampPlank(35), 35);
  assert.equal(clampPlank(0), 5);
  assert.equal(clampPlank(65), 60);
  assert.equal(clampPlank(32), 30);
});

test("plank: the hold logs the target at zero and the elapsed time when dropped early", () => {
  assert.equal(holdSeconds(30, 30), 30);
  assert.equal(holdSeconds(17, 30), 17);
  assert.equal(holdSeconds(0, 30), 0);
  assert.equal(holdSeconds(31, 30), 30);
  assert.equal(plankSetValue(30, 22), 22);
  assert.equal(plankSetValue(30, 30), 30);
});

test("skip: a skipped exercise has no key and changes nothing about it", () => {
  const done = dbWith([
    session(at(2026, 3, 2, 7), { row: [9, 5, 3], pike: [6, 4, 3] }),
    session(at(2026, 3, 4, 7), { row: [10, 6, 3], pike: [7, 4, 3] })
  ]);
  const skipped = dbWith(done.sessions.concat(session(at(2026, 3, 6, 7), { pike: [7, 5, 3] })));
  assert.equal("row" in skipped.sessions[2].log, false);
  assert.equal(history(skipped, "row").length, 2);
  for (const i of [0, 1, 2]) assert.equal(targetFor(skipped, "row", i), targetFor(done, "row", i));
  assert.equal(lifetime(skipped, "row"), lifetime(done, "row"));
  assert.deepEqual(chartData(skipped, "row", "total").series, chartData(done, "row", "total").series);
});
