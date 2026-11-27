/* Session flow: warm-up, sets, rests, feedback and the finish screen. */
import { EX, FULL, SETS, REST_SET, REST_EX, REST_SIDE, WARMUP, FOOD } from "./config.js";
import { store, newSession } from "./store.js";
import { weekState } from "./weeks.js";
import { targetFor, needsFeedback, nextBridgeTarget, holdSeconds, plankSetValue } from "./targets.js";
import { milestones } from "./milestones.js";
import { beep, ding, click } from "./audio.js";
import { save, show, paintHome, drawGauge, creditHtml, mmss, toast } from "./ui.js";

/* S = {ids, i, set, log, side, wi, hold, fb, tick}. log holds only exercises that were
   done; a skipped exercise has no key. fb is the bridge feedback, applied at finish. */
let S = null;

/* The browser drops the lock by itself when the app is hidden; the "release" listener notices,
   so visibilitychange can take it again. A lock that arrives after the session ended is let go. */
let wake = null, asking = false;
async function keepAwake(on){
  try{
    if(on && "wakeLock" in navigator){
      if(wake || asking) return;
      asking = true;
      const lock = await navigator.wakeLock.request("screen").finally(() => { asking = false; });
      if(!S){ await lock.release(); return; }
      wake = lock;
      lock.addEventListener("release", () => { if(wake === lock) wake = null; });
    }
    else if(wake){ const lock = wake; wake = null; await lock.release(); }
  }catch(e){}
}

export function start(){
  S = { ids: FULL.slice(), i:0, set:0, log:{}, side:0, wi:0, hold:[], fb:null };
  keepAwake(true);
  warmStart();
}
function endSession(){ keepAwake(false); }

/* ---- warm-up ---- */
let wuTimer = null;
function warmStart(){ S.wi = 0; show("s-warm"); warmRender(); }
function warmRender(){
  const box = document.getElementById("wu-list");
  box.innerHTML = WARMUP.map((w,i) =>
    '<div class="wu '+(i===S.wi?"active":(i<S.wi?"done":""))+'">'+
      '<span class="n">'+(i+1)+'</span>'+
      '<span class="nm">'+w.n+'<small>'+w.d+'</small></span>'+
      '<span class="t">'+w.s+'s</span></div>').join("");
  clearInterval(wuTimer);
  let left = WARMUP[S.wi].s;
  document.getElementById("wu-time").textContent = mmss(left);
  wuTimer = setInterval(() => {
    left--;
    document.getElementById("wu-time").textContent = mmss(Math.max(0,left));
    if(left <= 0){ clearInterval(wuTimer); ding(); warmNext(); }
  }, 1000);
}
function warmNext(){
  S.wi++;
  if(S.wi >= WARMUP.length){ clearInterval(wuTimer); workStart(); }
  else warmRender();
}

/* ---- work ---- */
let clk = null;
function workStart(){ S.i = 0; S.set = 0; S.side = 0; renderWork(); }

function renderWork(){
  clearInterval(clk);
  show("s-work");
  const id = S.ids[S.i], e = EX[id];
  document.getElementById("w-progress").textContent = (S.i+1) + " / " + S.ids.length;
  document.getElementById("w-pips").innerHTML =
    [0,1,2].map(n => '<span class="pip '+(n<S.set?"past":(n===S.set?"on":""))+'"></span>').join("");
  document.getElementById("w-name").textContent = e.name;
  document.getElementById("w-cue").textContent = e.cue;
  document.getElementById("w-skip").style.display = S.set === 0 && S.side === 0 ? "block" : "none";

  const t = targetFor(store.db, id, S.set);
  const timed = e.unit === "secs";
  document.getElementById("w-timer").style.display = timed ? "block" : "none";
  document.getElementById("w-reps").style.display  = timed ? "none"  : "block";

  if(timed){
    document.getElementById("w-side").textContent = S.side === 0 ? "Left side" : "Right side";
    document.getElementById("w-tgtline").textContent = "Hold " + t + " s";
    runClock(t);
  } else {
    const label = e.sides === 2 ? "per leg" : "reps";
    document.getElementById("w-unit").textContent = label;
    const tn = document.getElementById("w-target");
    tn.textContent = t == null ? "free" : t;
    tn.className = "targetnum" + (t == null ? " none" : "");
    setVal(t == null ? 10 : t);
  }
}
/* Counts down from the target and logs it at zero. Never logs more than the target. */
function runClock(target){
  const el = document.getElementById("w-clock");
  let n = 0; el.textContent = mmss(target); el.className = "bigtime";
  clk = setInterval(() => {
    n++; el.textContent = mmss(target - n);
    const left = target - n;
    if(left <= 3 && left > 0) beep(520,80,.15);
    if(left <= 0){ clearInterval(clk); ding(); holdDone(holdSeconds(n, target)); }
  }, 1000);
  S.tick = () => holdSeconds(n, target);
}
/* One side of a plank set is over: switch sides, or log the weaker side. */
function holdDone(secs){
  S.hold.push(secs);
  if(S.side === 0){ S.side = 1; rest(REST_SIDE, "switch-sides", renderWork); }
  else {
    const v = plankSetValue(S.hold[0], S.hold[1]);
    S.hold = []; S.side = 0;
    commitSet(v);
  }
}

function setVal(v){
  v = Math.max(0, v|0);
  document.getElementById("w-val").value = v;
  document.getElementById("w-log").textContent = "Log " + v;
}

function commitSet(v){
  const id = S.ids[S.i];
  if(!S.log[id]) S.log[id] = [];
  S.log[id][S.set] = v;
  S.set++;
  if(S.set < SETS){ rest(REST_SET, "rest", renderWork); return; }
  afterExercise();
}
function nextExercise(){
  S.i++; S.set = 0; S.side = 0; S.hold = [];
  if(S.i >= S.ids.length) finish();
  else rest(REST_EX, "rest", renderWork);
}
function skipExercise(){
  const id = S.ids[S.i];
  if(!confirm("Skip " + EX[id].name.toLowerCase() + " today? Nothing is logged for it.")) return;
  clearInterval(clk); click();
  delete S.log[id];
  if(id === "bridge") S.fb = null;
  nextExercise();
}
function afterExercise(){
  const id = S.ids[S.i], e = EX[id];
  if(id === "bridge") S.fb = null;
  if(needsFeedback(store.db, id, S.log[id])){
    show("s-fb");
    document.getElementById("fb-name").textContent = e.name;
    document.getElementById("fb-q").textContent =
      "You held the target every set. How did that feel?";
    document.querySelectorAll("[data-fb]").forEach(b => b.onclick = () => {
      click(); S.fb = b.dataset.fb; nextExercise();
    });
  } else nextExercise();
}

/* ---- rest ---- */
let rt = null;
function rest(secs, label, done){
  show("s-rest");
  document.getElementById("r-label").textContent = label;
  const nx = S.set < SETS ? EX[S.ids[S.i]].name : (S.ids[S.i+1] ? EX[S.ids[S.i+1]].name : "");
  document.getElementById("r-next").textContent = nx ? ("Next up: " + nx) : "";
  const arc = document.getElementById("r-arc"), txt = document.getElementById("r-text");
  const C = 2 * Math.PI * 98;
  arc.setAttribute("stroke-dasharray", C);
  let n = secs;
  const paint = () => {
    txt.textContent = n;
    arc.setAttribute("stroke-dashoffset", C * (1 - n/secs));
  };
  paint();
  clearInterval(rt);
  rt = setInterval(() => {
    n--; paint();
    if(n <= 3 && n > 0) beep(520,80,.15);
    if(n <= 0){ clearInterval(rt); ding(); done(); }
  }, 1000);
  document.getElementById("r-skip").onclick = () => { clearInterval(rt); click(); done(); };
  document.getElementById("r-quit").onclick = () => {
    if(!confirm("Stop here and throw away this session?")) return;
    clearInterval(rt); clearInterval(clk); clearInterval(wuTimer);
    S = null; endSession(); show("s-home");
  };
  document.getElementById("r-undo").onclick = () => {
    clearInterval(rt);
    if(S.hold.length){ S.hold = []; S.side = 0; }   // mid-set, just redo the set
    else if(S.set > 0){ S.set--; }
    else if(S.i > 0){
      S.i--;
      S.set = S.log[S.ids[S.i]] ? SETS-1 : 0;          // a skipped exercise starts again
    }
    renderWork();
  };
}

/* ---- finish ---- */
function finish(){
  const DB = store.db;
  clearInterval(rt); clearInterval(clk);
  const { log, fb } = S;
  S = null; endSession();   // no session is active from here on, so the wake lock stays off
  if(!Object.keys(log).length){
    show("s-home"); toast("Every exercise skipped. Nothing saved.");
    return;
  }
  if(log.bridge) DB.targets.bridge = nextBridgeTarget(DB, log.bridge, fb);
  const before = milestones(DB);
  const sess = newSession(Date.now(), log);
  DB.sessions.push(sess);
  DB.sessions.sort((a,b) => a.ts - b.ts);
  save();
  const after = milestones(DB);
  const fresh = after.filter(m => m.got && !before.find(x => x.k === m.k && x.got));

  const w = weekState(DB);
  document.getElementById("d-title").textContent =
    w.need === 0 ? "Week banked" : "Logged. " + w.need + (w.need === 1 ? " session" : " sessions") + " to go.";
  document.getElementById("d-credit").innerHTML = creditHtml(w.c);
  const ds = document.getElementById("d-status");
  ds.className = "status " + w.cls; ds.textContent = w.txt;
  drawGauge(document.getElementById("d-gauge"), w.c);
  document.getElementById("d-note").textContent = w.note;
  document.getElementById("d-new").innerHTML = fresh.length
    ? '<div class="card accent" style="margin-top:12px">' +
      '<p class="label" style="margin-bottom:8px;color:var(--accent)">/new-milestone' +
      (fresh.length>1?"s":"") + '</p>' +
      fresh.map(m => '<div style="margin-bottom:4px">' + m.name + '</div>').join("") + '</div>'
    : "";
  document.getElementById("d-food").textContent = FOOD[Math.floor(Math.random()*FOOD.length)];
  show("s-done");
  paintHome();
}

export function initPlayer(){
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible" && S && !wake) keepAwake(true);
  });
  document.getElementById("wu-next").onclick = () => { click(); warmNext(); };
  document.getElementById("wu-skip").onclick = () => { clearInterval(wuTimer); workStart(); };
  document.getElementById("w-stop").onclick = () => {
    const n = S.tick(); clearInterval(clk); click();
    holdDone(n);
  };
  document.getElementById("w-skip").onclick = skipExercise;
  document.getElementById("w-minus").onclick = () => { click(); setVal((+document.getElementById("w-val").value||0)-1); };
  document.getElementById("w-plus").onclick  = () => { click(); setVal((+document.getElementById("w-val").value||0)+1); };
  document.getElementById("w-val").oninput   = e => {
    document.getElementById("w-log").textContent = "Log " + (+e.target.value||0);
  };
  document.getElementById("w-val").onblur    = e => setVal(+e.target.value||0);
  document.getElementById("w-val").onfocus   = e =>
    setTimeout(() => e.target.scrollIntoView({block:"center"}), 250);
  document.getElementById("w-log").onclick   = () => commitSet(+document.getElementById("w-val").value||0);
}
