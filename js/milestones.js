/* Lifetime totals and milestones. No DOM access. */
import { EX, REP_TIERS, SEC_TIERS, WEEK_TIERS, CHAIN_TIERS, SESS_TIERS, TON_TIERS, HOUR_TIERS } from "./config.js";
import { hasBw } from "./store.js";
import { chain } from "./weeks.js";
import { history, targetFor } from "./targets.js";

export function dur(s){
  if(s >= 3600) return +(s/3600).toFixed(s%3600 ? 1 : 0) + (s < 7200 ? " hour" : " hours");
  if(s >= 60)   return Math.round(s/60) + " minutes";
  return s + " seconds";
}

export function lifetime(db, id){
  return history(db, id).reduce((a,x) => a + x.vals.reduce((p,q) => p+q, 0), 0) * EX[id].sides;
}
/* The progress screen's summary for one exercise; null if it was never done. An archived
   exercise is no longer trained, so it has no next targets.                               */
export function exerciseSummary(db, id){
  const h = history(db, id);
  if(!h.length) return null;
  const totals = h.map(x => x.vals.reduce((a,b) => a+b, 0));
  return {
    sessions: h.length,
    bestSet: Math.max.apply(null, h.map(x => Math.max.apply(null, x.vals))),
    bestTotal: Math.max.apply(null, totals),
    lifetime: lifetime(db, id),
    targets: EX[id].archived ? null : [0,1,2].map(i => targetFor(db, id, i))
  };
}
/* null until a bodyweight is set. Bodyweight exercises move a share of it per rep. A pack
   exercise moves the pack weight saved on that session, so changing the setting later never
   changes past load; a session without a pack weight adds nothing.                         */
export function tonnage(db){
  if(!hasBw(db)) return null;
  let kg = 0;
  Object.keys(EX).forEach(id => {
    if(EX[id].pack){
      db.sessions.forEach(s => {
        if(s.log[id] && s.pack > 0) kg += s.log[id].reduce((p,q) => p+q, 0) * EX[id].sides * s.pack;
      });
    }
    else kg += lifetime(db, id) * EX[id].load * db.bw;
  });
  return Math.round(kg);
}
export function tut(db){   // seconds under tension
  let s = 0;
  Object.keys(EX).forEach(id => {
    s += id === "plank" ? lifetime(db, id) : lifetime(db, id) * EX[id].spr;
  });
  return Math.round(s);
}
export function milestones(db, now = new Date()){
  const out = [];
  const c = chain(db, now);
  Object.keys(EX).forEach(id => {
    const n = lifetime(db, id), timed = EX[id].unit === "secs";
    (timed ? SEC_TIERS : REP_TIERS).forEach(t => out.push({
      k:"r-"+id+"-"+t, got:n>=t, p:Math.min(1,n/t),
      name: (timed ? dur(t) : t.toLocaleString("en-GB") + " reps") +
            " of " + EX[id].name.toLowerCase(),
      sub: (timed ? dur(n) : n.toLocaleString("en-GB")) + " so far"
    }));
  });
  SESS_TIERS.forEach(t => out.push({
    k:"s-"+t, got:db.sessions.length>=t, p:Math.min(1,db.sessions.length/t),
    name: t + (t===1?" session":" sessions") + " logged", sub: db.sessions.length + " so far"}));
  WEEK_TIERS.forEach(t => out.push({
    k:"w-"+t, got:c.banked>=t, p:Math.min(1,c.banked/t),
    name: t + (t===1?" week":" weeks") + " banked", sub: c.banked + " so far"}));
  CHAIN_TIERS.forEach(t => out.push({
    k:"c-"+t, got:c.streak>=t, p:Math.min(1,c.streak/t),
    name: t + " weeks in a row", sub: "streak is " + c.streak}));
  const kg = tonnage(db);
  TON_TIERS.forEach(t => out.push(kg === null ? {
    k:"t-"+t[0], got:false, p:0, na:true,
    name: t[0].toLocaleString("en-GB") + " kg moved",
    sub: "Set bodyweight in Settings"} : {
    k:"t-"+t[0], got:kg>=t[0], p:Math.min(1,kg/t[0]),
    name: t[0].toLocaleString("en-GB") + " kg moved",
    sub: "the weight of " + t[1]}));
  const h = tut(db)/3600;
  HOUR_TIERS.forEach(t => out.push({
    k:"h-"+t, got:h>=t, p:Math.min(1,h/t),
    name: t + (t===1?" hour":" hours") + " under tension", sub: h.toFixed(1) + " so far"}));
  return out;
}
