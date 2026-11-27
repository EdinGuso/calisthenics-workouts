import { at, session, dbWith, fixture } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { weekKey, mondayOf, sessionsIn, chain, weekState } from "../js/weeks.js";

test("weekKey: ordinary weeks run Monday to Sunday", () => {
  assert.equal(weekKey(at(2026, 3, 2, 0, 0)), "2026-W10");
  assert.equal(weekKey(at(2026, 3, 8, 23, 59)), "2026-W10");
  assert.equal(weekKey(at(2026, 3, 9, 0, 0)), "2026-W11");
});

test("weekKey: daylight saving changes do not move a session into another week", () => {
  // Spring forward on Sunday 29 March 2026, fall back on Sunday 25 October 2026.
  assert.equal(weekKey(at(2026, 3, 29, 23, 30)), "2026-W13");
  assert.equal(weekKey(at(2026, 3, 30, 0, 30)), "2026-W14");
  assert.equal(weekKey(at(2026, 10, 25, 23, 30)), "2026-W43");
  assert.equal(weekKey(at(2026, 10, 26, 0, 30)), "2026-W44");
});

test("weekKey: ISO week 53 and the year boundary", () => {
  assert.equal(weekKey(at(2026, 12, 31)), "2026-W53");
  assert.equal(weekKey(at(2027, 1, 3, 23, 0)), "2026-W53");
  assert.equal(weekKey(at(2027, 1, 4, 0, 0)), "2027-W01");
  assert.equal(weekKey(at(2024, 12, 30)), "2025-W01");
  assert.equal(weekKey(at(2021, 1, 3)), "2020-W53");
});

test("mondayOf: local midnight of the week's Monday", () => {
  assert.equal(+mondayOf(at(2026, 3, 4, 15, 0)), +at(2026, 3, 2, 0, 0));
  assert.equal(+mondayOf(at(2026, 3, 8, 23, 0)), +at(2026, 3, 2, 0, 0));
  assert.equal(+mondayOf(at(2026, 3, 2, 0, 0)), +at(2026, 3, 2, 0, 0));
  assert.equal(+mondayOf(at(2026, 3, 29, 23, 30)), +at(2026, 3, 23, 0, 0));
  assert.equal(+mondayOf(at(2026, 3, 30, 10, 0)), +at(2026, 3, 30, 0, 0));
});

test("sessionsIn: counts the sessions in one ISO week", () => {
  const db = fixture();
  assert.equal(sessionsIn(db, "2026-W10"), 2);
  assert.equal(sessionsIn(db, "2026-W11"), 3);
  assert.equal(sessionsIn(db, "2026-W12"), 1);
  assert.equal(sessionsIn(db, "2026-W13"), 2);
  assert.equal(sessionsIn(db, "2026-W14"), 3);
  assert.equal(sessionsIn(db, "2026-W17"), 0);
});

test("chain: no sessions means nothing", () => {
  assert.deepEqual(chain(dbWith([]), at(2026, 5, 20)), { streak: 0, freezes: 0, banked: 0 });
});

test("chain: banks at 2 sessions, earns freezes at 3, caps them at 2, spends them on failed weeks", () => {
  const db = fixture();
  // Through W17: banked W10, W11 (+freeze), W12 failed (freeze spent), W13, W14 (+freeze),
  // W15 (+freeze), W16 (cap of 2), W17 empty (freeze spent).
  assert.deepEqual(chain(db, at(2026, 4, 29)), { streak: 6, freezes: 1, banked: 6 });
  // W18 empty spends the last freeze, W19 empty resets the streak, W20 banks again.
  assert.deepEqual(chain(db, at(2026, 5, 20)), { streak: 1, freezes: 0, banked: 7 });
});

test("chain: the current week does not count yet", () => {
  const db = fixture();
  assert.deepEqual(chain(db, at(2026, 5, 14)), { streak: 0, freezes: 0, banked: 6 });
});

test("chain: a failed week without a freeze resets the streak", () => {
  const db = dbWith([
    session(at(2026, 3, 3, 7)), session(at(2026, 3, 5, 7)),
    session(at(2026, 3, 10, 7)),
    session(at(2026, 3, 17, 7)), session(at(2026, 3, 19, 7))
  ]);
  assert.deepEqual(chain(db, at(2026, 3, 25)), { streak: 1, freezes: 0, banked: 2 });
});

test("weekState: Banked", () => {
  const two = dbWith([session(at(2026, 5, 11, 7)), session(at(2026, 5, 12, 7))]);
  const s = weekState(two, at(2026, 5, 13));
  assert.equal(s.key, "2026-W20");
  assert.equal(s.c, 2);
  assert.equal(s.need, 0);
  assert.equal(s.cls, "st-done");
  assert.equal(s.txt, "Banked");
  assert.equal(s.note, "Week banked. One more session earns a freeze.");

  const three = dbWith([...two.sessions, session(at(2026, 5, 13, 7))]);
  const t = weekState(three, at(2026, 5, 13, 18));
  assert.equal(t.txt, "Banked");
  assert.equal(t.note, "Three sessions. A freeze is yours.");
});

test("weekState: Out of days", () => {
  const s = weekState(dbWith([]), at(2026, 5, 17));
  assert.equal(s.left, 1);
  assert.equal(s.need, 2);
  assert.equal(s.cls, "st-risk");
  assert.equal(s.txt, "Out of days");
  assert.equal(s.note, "Not enough days left. A freeze will cover this week if you have one.");
});

test("weekState: At risk", () => {
  const sat = weekState(dbWith([]), at(2026, 5, 16));
  assert.equal(sat.left, 2);
  assert.equal(sat.cls, "st-risk");
  assert.equal(sat.txt, "At risk");
  assert.equal(sat.note, "2 sessions to go and only 2 days left.");

  const sun = weekState(dbWith([session(at(2026, 5, 12, 7))]), at(2026, 5, 17));
  assert.equal(sun.txt, "At risk");
  assert.equal(sun.note, "1 session to go and only 1 day left.");
});

test("weekState: Getting tight", () => {
  const thu = weekState(dbWith([]), at(2026, 5, 14));
  assert.equal(thu.left, 4);
  assert.equal(thu.cls, "st-tight");
  assert.equal(thu.txt, "Getting tight");
  assert.equal(thu.note, "2 sessions to go, 4 days left.");
  assert.equal(weekState(dbWith([]), at(2026, 5, 15)).txt, "Getting tight");
});

test("weekState: On track", () => {
  const mon = weekState(dbWith([]), at(2026, 5, 11));
  assert.equal(mon.left, 7);
  assert.equal(mon.cls, "st-ok");
  assert.equal(mon.txt, "On track");
  assert.equal(mon.note, "2 sessions to go, 7 days left.");
  const wed = weekState(dbWith([session(at(2026, 5, 11, 7))]), at(2026, 5, 13));
  assert.equal(wed.txt, "On track");
  assert.equal(wed.note, "1 session to go, 5 days left.");
});

test("chain: banking and freezes count sessions", () => {
  const week = (d, n) => Array.from({ length: n }, (_, i) => session(at(2026, 3, d + i, 7)));
  const db = dbWith([
    ...week(2, 3),   // W10: 3 sessions banks and earns a freeze
    ...week(9, 1),   // W11: 1 session fails and spends it
    ...week(16, 2),  // W12: 2 sessions banks, no freeze
    ...week(23, 1)   // W13: 1 session fails with no freeze left
  ]);
  assert.deepEqual(chain(db, at(2026, 3, 16)), { streak: 1, freezes: 0, banked: 1 });
  assert.deepEqual(chain(db, at(2026, 3, 23)), { streak: 2, freezes: 0, banked: 2 });
  assert.deepEqual(chain(db, at(2026, 3, 30)), { streak: 0, freezes: 0, banked: 2 });
});
