import { at } from "./helpers.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../js/store.js";

test("newSession: new sessions are always full and worth one session", () => {
  const ts = at(2026, 3, 2, 7).getTime();
  const log = { pushup: [5, 4, 3] };
  assert.deepEqual(newSession(ts, log), { id: ts, ts, type: "full", credit: 1, log });
});
