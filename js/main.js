/* Entry point: load the data, wire the screens, register the service worker. */
import { store, load } from "./store.js";
import { beep } from "./audio.js";
import { initUi, show, paintHome } from "./ui.js";
import { initPlayer, start } from "./player.js";
import { initSettings } from "./settings.js";

store.db = load();

initPlayer();
initUi();
document.getElementById("go").onclick = () => { beep(660,90,.18); show("s-choose"); };
document.getElementById("pick-full").onclick  = () => start("full");
document.getElementById("pick-short").onclick = () => start("short");
initSettings();

if("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
paintHome();
