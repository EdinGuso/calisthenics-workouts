/* ISO weeks, weekly banking, streak and freezes. No DOM access. */

export function weekKey(d){
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(),0,1));
  const wk = Math.ceil(((t - y0)/86400000 + 1)/7);
  return t.getUTCFullYear() + "-W" + String(wk).padStart(2,"0");
}
export function mondayOf(d){
  const x = new Date(d); const day = x.getDay() || 7;
  x.setHours(0,0,0,0); x.setDate(x.getDate() - day + 1); return x;
}
export function sessionsIn(db, key){
  return db.sessions.filter(s => weekKey(new Date(s.ts)) === key).length;
}
const sessions = n => n + (n === 1 ? " session" : " sessions");
/* streak and freezes are always recomputed, never stored */
export function chain(db, now = new Date()){
  if(!db.sessions.length) return {streak:0, freezes:0, banked:0};
  const first = mondayOf(new Date(db.sessions[0].ts));
  const thisMon = mondayOf(now);
  let streak = 0, freezes = 0, banked = 0;
  const m = new Date(first);
  while(m < thisMon){
    m.setHours(0,0,0,0);              // clocks change, weeks should not
    const c = sessionsIn(db, weekKey(m));
    if(c >= 2){ streak++; banked++; if(c >= 3) freezes = Math.min(2, freezes+1); }
    else if(freezes > 0){ freezes--; }
    else { streak = 0; }
    m.setDate(m.getDate()+7);
  }
  return {streak, freezes, banked};
}
export function weekState(db, now = new Date()){
  const key = weekKey(now);
  const c = sessionsIn(db, key);
  const dow = now.getDay() || 7;
  const left = 8 - dow;                       // days remaining including today
  const need = Math.max(0, 2 - c);
  let cls = "st-ok", txt = "On track", note;
  if(need === 0){
    cls = "st-done"; txt = "Banked";
    note = c >= 3 ? "Three sessions. A freeze is yours."
                  : "Week banked. One more session earns a freeze.";
  } else if(need > left){
    cls = "st-risk"; txt = "Out of days";
    note = "Not enough days left. A freeze will cover this week if you have one.";
  } else if(left <= 2){
    cls = "st-risk"; txt = "At risk";
    note = sessions(need) + " to go and only " + left + (left===1?" day":" days") + " left.";
  } else if(left <= 4){
    cls = "st-tight"; txt = "Getting tight";
    note = sessions(need) + " to go, " + left + " days left.";
  } else {
    note = sessions(need) + " to go, " + left + " days left.";
  }
  return {key, c, need, left, cls, txt, note};
}
