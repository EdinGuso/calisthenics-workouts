import { at, session, dbWith, fixture } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { history, targetFor, updateCap } from "../js/targets.js";

test("history: chronological entries for one exercise, skipping sessions without it", () => {
  const db = dbWith([
    session(at(2026, 3, 2, 7), { pushup: [5, 4, 3] }),
    session(at(2026, 3, 4, 7), { squat: [9, 8, 7] }),
    session(at(2026, 3, 6, 7), { pushup: [6, 5, 4] })
  ]);
  assert.deepEqual(history(db, "pushup").map(h => h.vals), [[5, 4, 3], [6, 5, 4]]);
  assert.deepEqual(history(db, "pushup")[0], { ts: db.sessions[0].ts, type: "full", vals: [5, 4, 3] });
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
  assert.equal(targetFor(db, "plank", 2), 25);
  assert.equal(targetFor(dbWith([]), "bridge", 0), null);
});

const capAfter = (id, cap, vals, fb) => {
  const db = dbWith([], { caps: cap == null ? {} : { [id]: cap } });
  updateCap(db, id, vals, fb);
  return db.caps[id];
};

test("updateCap: first session sets the baseline to the weakest set, rounded to the step", () => {
  assert.equal(capAfter("bridge", null, [10, 9, 8], null), 8);
  assert.equal(capAfter("plank", null, [33, 30, 27], null), 25);
  assert.equal(capAfter("plank", null, [40, 38, 38], null), 40);
  assert.equal(capAfter("plank", null, [0, 0, 0], null), 5);
  assert.equal(capAfter("bridge", null, [0, 0, 0], null), 1);
});

test("updateCap: a missed set eases the target to the rounded weakest set", () => {
  assert.equal(capAfter("bridge", 10, [10, 9, 7], null), 7);
  assert.equal(capAfter("plank", 35, [35, 32, 35], null), 30);
  // Rounding to the nearest step can keep the target where it was.
  assert.equal(capAfter("plank", 35, [35, 33, 35], null), 35);
  // A miss wins over the feedback.
  assert.equal(capAfter("bridge", 10, [10, 9, 10], "easy"), 9);
});

test("updateCap: all sets met, feedback moves the target by one step within its limits", () => {
  assert.equal(capAfter("bridge", 10, [10, 10, 10], "easy"), 11);
  assert.equal(capAfter("bridge", 10, [12, 11, 10], "right"), 10);
  assert.equal(capAfter("bridge", 10, [10, 10, 10], "hard"), 9);
  assert.equal(capAfter("bridge", 18, [18, 18, 18], "easy"), 18);
  assert.equal(capAfter("bridge", 1, [1, 1, 1], "hard"), 1);
  assert.equal(capAfter("plank", 30, [30, 30, 30], "easy"), 35);
  assert.equal(capAfter("plank", 60, [60, 60, 60], "easy"), 60);
  assert.equal(capAfter("plank", 30, [30, 30, 30], "hard"), 25);
  assert.equal(capAfter("plank", 5, [5, 5, 5], "hard"), 5);
  assert.equal(capAfter("plank", 30, [30, 30, 30], null), 30);
});
