// Shared test setup. Week maths depends on the local time zone, so every test
// runs in a zone with daylight saving time.
process.env.TZ = "Europe/Zurich";

import fs from "node:fs";
import { newSession } from "../js/store.js";

const FIXTURES = new URL("./fixtures/", import.meta.url);

/** A fresh copy of a synthetic fixture database. */
export function fixture(name = "sessions") {
  return JSON.parse(fs.readFileSync(new URL(name + ".json", FIXTURES), "utf8"));
}

/** Local date helper: month is 1-based. */
export function at(y, mo, d, h = 12, mi = 0) {
  return new Date(y, mo - 1, d, h, mi);
}

/** A full session at a local date with the given log. */
export function session(date, log = {}) {
  const ts = date.getTime();
  return newSession(ts, log);
}

/** A database with just these sessions. */
export function dbWith(sessions, extra = {}) {
  return { v: 1, bw: null, sessions, commits: {}, caps: {}, seen: [], ...extra };
}
