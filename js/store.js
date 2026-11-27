/* Persistence. The whole database is one JSON value in localStorage. */
import { PACK_MIN, PACK_MAX } from "./config.js";

/* Name-independent, so renaming the app needs no second conversion. */
export const KEY = "workouts.v2";
export const PLANK_DEFAULT = 30;

/* The live database. Modules read store.db at call time, because import and
   reset replace it. */
export const store = { db: null };

export function blank(){
  return {v:2, bw:null, pack:null, sessions:[], commits:{}, targets:{plank:PLANK_DEFAULT}};
}
export function load(){
  try{ const r = localStorage.getItem(KEY); if(r) return Object.assign(blank(), JSON.parse(r)); }
  catch(e){ console.warn(e); }
  return blank();
}
/* Returns false if the browser refused to store it. */
export function write(db){
  try{ localStorage.setItem(KEY, JSON.stringify(db)); return true; }catch(e){ return false; }
}
/* log holds only the exercises that were done; a skipped exercise has no key.
   pack is the backpack weight in kg, saved only when backpack rows were done. */
export function newSession(ts, log, pack){
  return pack != null && log.packrow ? { id: ts, ts, log, pack } : { id: ts, ts, log };
}
export function hasBw(db){ return typeof db.bw === "number" && db.bw > 0; }
export function hasPack(db){ return typeof db.pack === "number" && db.pack > 0; }
/* A typed pack weight in kg, or null if it is outside PACK_MIN..PACK_MAX. */
export function packValue(v){
  v = +v;
  return v >= PACK_MIN && v <= PACK_MAX ? v : null;
}
export const PACK_ASK = "Enter the pack weight, " + PACK_MIN + " to " + PACK_MAX + " kg";

/* Export and import files. */
export function exportJson(db){ return JSON.stringify(db,null,2); }
export function exportName(now = new Date()){ return "calisthenics-workouts-" + now.toISOString().slice(0,10) + ".json"; }

export const OLD_FILE = "This file is from the old version";
export const BAD_FILE = "That file did not read";
/* Accepts only v2 exports. Throws an Error whose message is shown to the user. */
export function parseImport(text){
  let d;
  try{ d = JSON.parse(text); }catch(e){ throw new Error(BAD_FILE); }
  if(!d || typeof d !== "object") throw new Error(BAD_FILE);
  if(d.v !== 2) throw new Error(d.v === 1 ? OLD_FILE : BAD_FILE);
  const ok = Array.isArray(d.sessions) && d.sessions.every(s =>
    s && typeof s.ts === "number" && s.log && typeof s.log === "object");
  if(!ok) throw new Error(BAD_FILE);
  const db = Object.assign(blank(), d);
  db.targets = Object.assign(blank().targets, d.targets);
  return db;
}
