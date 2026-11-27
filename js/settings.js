/* Settings screen and the first-launch bodyweight question. */
import { store, blank, hasBw, exportJson, exportName, parseImport } from "./store.js";
import { save, show, paintHome, toast } from "./ui.js";

function setBw(v){
  v = +v;
  if(!(v > 0)){ toast("Enter your weight in kg"); return false; }
  store.db.bw = v; save(); toast("Saved"); return true;
}

export function initSettings(){
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
        store.db = parseImport(r.result); save(); paintHome();
        toast("Imported " + store.db.sessions.length + " sessions");
      }catch(e){ toast("That file did not read"); }
    };
    r.readAsText(f);
  };
  document.getElementById("cfg-reset").onclick = () => {
    if(confirm("Erase every session, milestone and streak? This cannot be undone.")){
      store.db = blank(); save(); paintHome(); show("s-home"); toast("Erased");
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
