import { at, session, dbWith, fixture } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartData, chartHtml } from "../js/chart.js";

const golden = fixture("chart-golden");

test("chartData: totals per session for one exercise", () => {
  const d = chartData(fixture(), "pushup", "total");
  assert.equal(d.series.length, 1);
  assert.equal(d.series[0].length, 19);
  assert.deepEqual(d.series[0].slice(0, 4), [18, 18, 19, 20]);
  assert.equal(d.series[0][18], 17 + 12 + 8);
});

test("chartData: one line per set position, missing sets drawn as zero", () => {
  const db = dbWith([
    session(at(2026, 3, 2, 7), { pushup: [5, 4, 3] }),
    session(at(2026, 3, 4, 7), { pushup: [6, 5] })
  ]);
  assert.deepEqual(chartData(db, "pushup", "sets").series, [[5, 6], [4, 5], [3, 0]]);
});

test("chartData: session volume counts reps across exercises, not seconds", () => {
  const d = chartData(fixture(), "__vol", "total");
  assert.equal(d.series.length, 1);
  assert.equal(d.series[0][0], 18 + 12 + 30 + 12 + 29 + 37);
  assert.equal(d.series[0][5], 22 + 0 + 35 + 13 + 29 + 42);
});

test("chartHtml: messages before there are two sessions", () => {
  assert.match(chartHtml(dbWith([]), "pushup", "total", 320), /Nothing logged yet\./);
  const one = dbWith([session(at(2026, 3, 2, 7), { pushup: [5, 4, 3] })]);
  assert.match(chartHtml(one, "pushup", "total", 320), /One session in\. The chart appears at two\./);
});

test("chartHtml: the rolling average appears only for single lines of three or more", () => {
  const dashed = html => (html.match(/stroke-dasharray="5 4"/g) || []).length;
  const db = fixture();
  assert.equal(dashed(chartHtml(db, "pushup", "total", 320)), 1);
  assert.equal(dashed(chartHtml(db, "pushup", "sets", 320)), 0);
  assert.equal(dashed(chartHtml(db, "__vol", "total", 320)), 1);
  const two = dbWith(db.sessions.slice(0, 2));
  assert.equal(dashed(chartHtml(two, "pushup", "total", 320)), 0);
});

test("chartHtml: matches the recorded output for every chart", () => {
  const db = fixture();
  for (const [key, html] of Object.entries(golden)) {
    const [sel, mode, width] = key.split(":");
    assert.equal(chartHtml(db, sel, mode, +width), html, key);
  }
});
