/* Exercise history, per-set targets and the short-session pick. No DOM access. */
import { EX, FULL, GROUP } from "./config.js";

export function history(db, id){            // chronological list of {ts,type,vals[]}
  return db.sessions.filter(s => s.log[id]).map(s => ({ts:s.ts, type:s.type, vals:s.log[id]}));
}
export function targetFor(db, id, setIdx){
  const e = EX[id];
  if(e.mode === "capped") return db.caps[id] || null;
  const h = history(db, id).slice(-3).map(x => x.vals[setIdx]).filter(v => typeof v === "number");
  if(!h.length) return null;
  return Math.max.apply(null, h) + 1;
}
export function updateCap(db, id, vals, feedback){
  const e = EX[id];
  const lo = Math.min.apply(null, vals);
  let cap = db.caps[id];
  if(cap == null){                          // first ever: baseline is the weakest set
    cap = Math.max(e.step, Math.round(lo / e.step) * e.step);
  } else if(lo < cap){                      // consistently missing, ease it down
    cap = Math.max(e.step, Math.round(lo / e.step) * e.step);
  } else if(feedback === "easy"){
    cap = Math.min(e.ceiling, cap + e.step);
  } else if(feedback === "hard"){
    cap = Math.max(e.step, cap - e.step);
  }
  db.caps[id] = cap;
}
/* Short session: rows always, plus the two least-used of the other six.
   The second must come from a different group, so you never get two leg
   exercises or two core exercises and call it a session.               */
export function shortPick(db){
  const appear = id => db.sessions.filter(s => s.log[id]).length;
  const pool = ["pushup","pike","squat","bridge","situp","plank"]
    .sort((a,b) => appear(a)-appear(b) || FULL.indexOf(a)-FULL.indexOf(b));
  const first  = pool[0];
  const second = pool.slice(1).find(x => GROUP[x] !== GROUP[first]) || pool[1];
  return [first, "row", second];
}
