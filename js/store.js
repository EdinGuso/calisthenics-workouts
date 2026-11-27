/* Persistence. The whole database is one JSON value in localStorage. */

export const KEY = "ledger.v1";

/* The live database. Modules read store.db at call time, because import and
   reset replace it. */
export const store = { db: null };

export function blank(){ return {v:1, bw:null, sessions:[], commits:{}, caps:{}, seen:[]}; }
export function load(){
  try{ const r = localStorage.getItem(KEY); if(r) return Object.assign(blank(), JSON.parse(r)); }
  catch(e){ console.warn(e); }
  return blank();
}
/* Returns false if the browser refused to store it. */
export function write(db){
  try{ localStorage.setItem(KEY, JSON.stringify(db)); return true; }catch(e){ return false; }
}
/* Every session is a full one. type and credit stay in the v1 format until the v2 conversion. */
export function newSession(ts, log){ return { id: ts, ts, type: "full", credit: 1, log }; }
export function hasBw(db){ return typeof db.bw === "number" && db.bw > 0; }

/* Export and import files. */
export function exportJson(db){ return JSON.stringify(db,null,2); }
export function exportName(now = new Date()){ return "ledger-" + now.toISOString().slice(0,10) + ".json"; }
/* Throws if the text is not a Ledger export. */
export function parseImport(text){
  const d = JSON.parse(text);
  if(!d.sessions) throw 0;
  return Object.assign(blank(), d);
}
