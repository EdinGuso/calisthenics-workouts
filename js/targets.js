/* Exercise history and per-set targets. No DOM access. */
import { EX } from "./config.js";

export function history(db, id){            // chronological list of {ts,vals[]}
  return db.sessions.filter(s => s.log[id]).map(s => ({ts:s.ts, vals:s.log[id]}));
}
export function targetFor(db, id, setIdx){
  const e = EX[id];
  if(e.mode === "capped") return db.targets[id] || null;
  const h = history(db, id).slice(-3).map(x => x.vals[setIdx]).filter(v => typeof v === "number");
  if(!h.length) return null;
  return Math.max.apply(null, h) + 1;
}
/* Bridge: the target follows what you did. Ask for feedback only when every set met it. */
export function needsFeedback(db, id, vals){
  const t = db.targets[id];
  return id === "bridge" && t != null && Math.min.apply(null, vals) >= t;
}
/* New bridge target after a done (not skipped) session. feedback is "easy", "right", "hard" or null. */
export function nextBridgeTarget(db, vals, feedback){
  const base = Math.min.apply(null, vals);
  let t = base;
  if(needsFeedback(db, "bridge", vals)){
    if(feedback === "easy") t = base + 1;
    else if(feedback === "hard") t = base - 1;
  }
  return Math.min(EX.bridge.ceiling, Math.max(1, t));
}
/* Plank target in Settings: 5 s steps, at least one step, at most the ceiling. */
export function clampPlank(v){
  const e = EX.plank;
  return Math.min(e.ceiling, Math.max(e.step, Math.round(v / e.step) * e.step));
}
/* Seconds logged for one plank side: the elapsed time, never more than the target. */
export function holdSeconds(elapsed, target){ return Math.max(0, Math.min(elapsed, target)); }
/* A plank set is logged as the weaker side. */
export function plankSetValue(left, right){ return Math.min(left, right); }
