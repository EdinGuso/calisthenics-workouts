/* Settings screen and the first-launch bodyweight question. */
import { store, blank, hasBw, hasPack, packValue, PACK_ASK, exportJson, exportName, parseImport } from "./store.js";
import { EX } from "./config.js";
import { clampPlank } from "./targets.js";
import { save, show, paintHome, toast } from "./ui.js";

function setBw(v){
  v = +v;
  if(!(v > 0)){ toast("Enter your weight in kg"); return false; }
  store.db.bw = v; save(); toast("Saved"); return true;
}

function paintPlank(){
  document.getElementById("cfg-plank").value = store.db.targets.plank;
  document.getElementById("cfg-pack").value = hasPack(store.db) ? store.db.pack : "";
}
function stepPlank(d){
  store.db.targets.plank = clampPlank(store.db.targets.plank + d * EX.plank.step);
  save(); paintPlank();
}

export function initSettings(){
  document.getElementById("cfg-plank-minus").onclick = () => stepPlank(-1);
  document.getElementById("cfg-plank-plus").onclick  = () => stepPlank(1);
  const pack = document.getElementById("cfg-pack");
  pack.onchange = () => {
    const v = packValue(pack.value);
    if(v === null){ toast(PACK_ASK); pack.value = hasPack(store.db) ? store.db.pack : ""; return; }
    store.db.pack = v; save(); toast("Saved");
  };
  const bw = document.getElementById("cfg-bw");
  bw.onchange = () => { if(!setBw(bw.value)) bw.value = hasBw(store.db) ? store.db.bw : ""; };
  document.getElementById("bw-ask-save").onclick = () => {
    if(setBw(document.getElementById("bw-ask-in").value)) paintHome();
  };
  document.getElementById("cfg-export").onclick = () => {
    const blob = new Blob([exportJson(store.db)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = exportName();
    a.click();
  };
  document.getElementById("cfg-import").onclick = () => document.getElementById("cfg-file").click();
  document.getElementById("cfg-file").onchange = ev => {
    const f = ev.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try{
        store.db = parseImport(r.result); save(); paintHome(); paintPlank();
        toast("Imported " + store.db.sessions.length + " sessions");
      }catch(e){ toast(e.message); }
    };
    r.readAsText(f);
  };
  document.getElementById("cfg-reset").onclick = () => {
    if(confirm("Erase every session, milestone and streak? This cannot be undone.")){
      store.db = blank(); save(); paintHome(); paintPlank(); show("s-home"); toast("Erased");
    }
  };
  (async () => {
    const el = document.getElementById("cfg-persist");
    try{
      if(navigator.storage && navigator.storage.persist){
        const ok = await navigator.storage.persist();
        el.textContent = ok
          ? "Storage is marked as durable. Safari will not clear it on its own."
          : "Safari has not marked this durable yet. Keep the icon on your home screen and use it, and export now and then.";
      } else el.textContent = "This browser will not say. Export now and then.";
    }catch(e){ el.textContent = "Export now and then."; }
  })();
}
