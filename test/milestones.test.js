import { at, session, dbWith, fixture } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifetime, tonnage, tut, milestones, dur } from "../js/milestones.js";

const NOW = at(2026, 5, 20);

test("lifetime: every logged rep or second, times the number of sides", () => {
  const db = fixture();
  assert.equal(lifetime(db, "pushup"), 510);
  assert.equal(lifetime(db, "row"), 266);
  assert.equal(lifetime(db, "squat"), 741);
  assert.equal(lifetime(db, "pike"), 264);
  assert.equal(lifetime(db, "bridge"), 1102);
  assert.equal(lifetime(db, "situp"), 874);
  assert.equal(lifetime(db, "plank"), 3230);
  assert.equal(lifetime(dbWith([]), "pushup"), 0);
});

test("tonnage: load factor times bodyweight, rounded; none without a bodyweight", () => {
  assert.equal(tonnage(fixture()), 137655);
  assert.equal(tonnage({ ...fixture(), bw: null }), null);
  assert.equal(tonnage({ ...fixture(), bw: 0 }), null);
  assert.equal(tonnage(dbWith([session(at(2026, 3, 2), { pushup: [10, 0, 0] })], { bw: 80 })), 512);
});

test("tut: seconds per rep, plus plank time", () => {
  assert.equal(tut(fixture()), 13848);
  assert.equal(tut(dbWith([])), 0);
});

test("dur: readable durations", () => {
  assert.equal(dur(45), "45 seconds");
  assert.equal(dur(300), "5 minutes");
  assert.equal(dur(3600), "1 hour");
  assert.equal(dur(5400), "1.5 hour");
  assert.equal(dur(7200), "2 hours");
  assert.equal(dur(72000), "20 hours");
});

test("milestones: the full set of keys", () => {
  const keys = milestones(fixture(), NOW).map(m => m.k);
  assert.equal(keys.length, 99);
  assert.equal(new Set(keys).size, 99);
  assert.deepEqual(keys.slice(0, 8), [
    "r-pushup-100", "r-pushup-250", "r-pushup-500", "r-pushup-1000",
    "r-pushup-2500", "r-pushup-5000", "r-pushup-10000", "r-pushup-25000"
  ]);
  assert.ok(keys.includes("r-plank-300") && keys.includes("r-plank-72000"));
  assert.deepEqual(keys.slice(64), [
    "s-1", "s-5", "s-10", "s-25", "s-50", "s-100", "s-250", "s-500",
    "w-1", "w-2", "w-4", "w-8", "w-12", "w-26", "w-52", "w-104",
    "c-2", "c-4", "c-8", "c-12", "c-26", "c-52",
    "t-1000", "t-7000", "t-40000", "t-150000", "t-420000", "t-2500000", "t-7300000",
    "h-1", "h-5", "h-10", "h-25", "h-50", "h-100"
  ]);
});

test("milestones: earned flags", () => {
  const got = milestones(fixture(), NOW).filter(m => m.got).map(m => m.k);
  assert.deepEqual(got, [
    "r-pushup-100", "r-pushup-250", "r-pushup-500",
    "r-row-100", "r-row-250",
    "r-squat-100", "r-squat-250", "r-squat-500",
    "r-pike-100", "r-pike-250",
    "r-bridge-100", "r-bridge-250", "r-bridge-500", "r-bridge-1000",
    "r-situp-100", "r-situp-250", "r-situp-500",
    "r-plank-300", "r-plank-900", "r-plank-1800",
    "s-1", "s-5", "s-10",
    "w-1", "w-2", "w-4",
    "t-1000", "t-7000", "t-40000",
    "h-1"
  ]);
});

test("milestones: the week-in-a-row tiers follow the current streak", () => {
  const got = milestones(fixture(), at(2026, 4, 29)).filter(m => m.k.startsWith("c-") && m.got);
  assert.deepEqual(got.map(m => m.k), ["c-2", "c-4"]);
});

test("milestones: names, progress and the no-bodyweight placeholder", () => {
  const ms = milestones({ ...fixture(), bw: null }, NOW);
  const by = k => ms.find(m => m.k === k);
  assert.deepEqual(by("r-pushup-1000"), {
    k: "r-pushup-1000", got: false, p: 0.51, name: "1,000 reps of push-ups", sub: "510 so far"
  });
  assert.equal(by("r-plank-3600").name, "1 hour of side plank");
  assert.equal(by("r-plank-3600").sub, "54 minutes so far");
  assert.deepEqual(by("t-1000"), {
    k: "t-1000", got: false, p: 0, na: true, name: "1,000 kg moved", sub: "Set bodyweight in Settings"
  });
  assert.equal(by("s-1").name, "1 session logged");
  assert.equal(by("w-8").sub, "7 so far");
  assert.equal(by("c-2").sub, "streak is 1");
  assert.equal(by("h-5").sub, "3.8 so far");
});
