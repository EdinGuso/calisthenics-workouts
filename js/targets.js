/* Exercise history and per-set targets. No DOM access. */
import { EX } from "./config.js";

export function history(db, id){            // chronological list of {ts,vals[]}
  return db.sessions.filter(s => s.log[id]).map(s => ({ts:s.ts, vals:s.log[id]}));
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
