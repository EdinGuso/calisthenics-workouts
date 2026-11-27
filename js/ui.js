/* Screens, painting and navigation. */
import { EX, FULL, TON_TIERS } from "./config.js";
import { store, write, hasBw } from "./store.js";
import { weekKey, chain, weekState } from "./weeks.js";
import { history, targetFor } from "./targets.js";
import { lifetime, tonnage, milestones } from "./milestones.js";
import { chartHtml } from "./chart.js";
import { click } from "./audio.js";

export function save(){ if(!write(store.db)) toast("Could not save"); }

/* Two slots, one per session this week. */
export function drawGauge(el, c){
  el.innerHTML = "";
  for(let i=0;i<2;i++){
    const slot = document.createElement("div");
    slot.className = "slot" + (c>i ? " fill" : "") + (c>=2 ? " done" : "");
    slot.innerHTML = '<span class="tag">'+(i+1)+'</span>';
    el.appendChild(slot);
  }
}
export function creditHtml(c){ return c + "<span> / 2 sessions</span>"; }

/* ============================================================
   STATS
   ============================================================ */
let stSel = "pushup", stMode = "total";
function chart(){
  const box = document.getElementById("st-chart");
  box.innerHTML = chartHtml(store.db, stSel, stMode, box.clientWidth);
}
function paintStats(){
  const DB = store.db;
  const chips = [{id:"__vol", n:"Session volume"}].concat(
    FULL.map(id => ({id, n:EX[id].name})));
  document.getElementById("st-chips").innerHTML = chips.map(c =>
    '<button class="chip '+(c.id===stSel?"sel":"")+'" data-ex="'+c.id+'">'+c.n+'</button>').join("");
  document.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => {
    stSel = b.dataset.ex; paintStats();
  });
  const btn = document.getElementById("st-mode");
  btn.style.display = stSel === "__vol" ? "none" : "block";
  document.getElementById("st-skiplegend").style.display = stSel === "__vol" ? "" : "none";
  btn.textContent = stMode === "total" ? "Show by set" : "Show total";
  chart();

  let sum = "";
  if(stSel !== "__vol"){
    const h = history(DB, stSel), e = EX[stSel];
    if(h.length){
      const totals = h.map(x => x.vals.reduce((a,b)=>a+b,0));
      const best = Math.max.apply(null, h.map(x => Math.max.apply(null, x.vals)));
      sum = row("Sessions", h.length) + row("Best single set", best + " " + e.unit) +
            row("Best session total", Math.max.apply(null,totals) + " " + e.unit) +
            row("Lifetime", lifetime(DB, stSel).toLocaleString("en-GB") + " " + e.unit) +
            row("Next targets", [0,1,2].map(i => targetFor(DB, stSel, i) || "-").join(" / "));
    } else sum = '<p class="dim small" style="margin:0">Not done yet.</p>';
  } else {
    const c = chain(DB);
    sum = row("Sessions", DB.sessions.length) +
          row("Weeks banked", c.banked) + row("Current streak", c.streak);
  }
  document.getElementById("st-summary").innerHTML = sum;
}
function row(a,b){
  return '<div class="statrow"><span class="dim small">'+a+'</span><span>'+b+'</span></div>';
}

/* ============================================================
   PAINT
   ============================================================ */
export function paintHome(){
  const DB = store.db;
  const now = new Date();
  document.getElementById("home-date").textContent =
    now.toLocaleDateString("en-GB", {weekday:"long", day:"numeric", month:"long"});
  const w = weekState(DB), c = chain(DB);
  document.getElementById("wk-credit").innerHTML = creditHtml(w.c);
  const st = document.getElementById("wk-status");
  st.className = "status " + w.cls; st.textContent = w.txt;
  drawGauge(document.getElementById("wk-gauge"), w.c);
  document.getElementById("wk-note").textContent = w.note;
  document.getElementById("m-streak").textContent = c.streak;
  document.getElementById("m-freeze").textContent = c.freezes;
  document.getElementById("m-total").textContent = DB.sessions.length;
  document.getElementById("bw-ask").style.display = hasBw(DB) ? "none" : "block";

  const key = w.key, sel = DB.commits[key] || [];
  const dow = new Date().getDay() || 7;
  const trained = {};
  DB.sessions.filter(s => weekKey(new Date(s.ts)) === key)
             .forEach(s => { trained[(new Date(s.ts).getDay()||7)] = true; });
  document.getElementById("daychips").innerHTML = ["M","T","W","T","F","S","S"].map((d,i) => {
    const n = i+1;
    return '<button class="day '+(trained[n]?"trained ":"")+(sel.includes(n)?"sel ":"")+
           (n===dow?"today":"")+'" data-day="'+n+'">'+d+'</button>';
  }).join("");
  document.querySelectorAll("[data-day]").forEach(b => b.onclick = () => {
    const n = +b.dataset.day, cur = store.db.commits[key] || [];
    store.db.commits[key] = cur.includes(n) ? cur.filter(x => x !== n) : cur.concat(n).sort();
    save(); paintHome(); click();
  });
}
function paintAch(){
  const kg = tonnage(store.db);
  if(kg === null){
    document.getElementById("a-tonnage").textContent = "-";
    document.getElementById("a-tonnage-note").textContent = "Set bodyweight in Settings.";
  } else {
    document.getElementById("a-tonnage").textContent = kg.toLocaleString("en-GB") + " kg";
    const next = TON_TIERS.find(t => kg < t[0]);
    document.getElementById("a-tonnage-note").textContent = next
      ? (next[0]-kg).toLocaleString("en-GB") + " kg to " + next[1] + "."
      : "You have moved the Eiffel Tower. Take the morning off.";
  }
  const ms = milestones(store.db);
  const got = ms.filter(m => m.got);
  const near = ms.filter(m => !m.got).sort((a,b) => b.p - a.p).slice(0, 8);
  const render = m => '<div class="ach '+(m.got?"got":"locked")+'">'+
    '<span class="med">'+(m.got?"✓":m.na?"-":Math.round(m.p*100)+"%")+'</span>'+
    '<span class="nm">'+m.name+'<small>'+m.sub+'</small>'+
    (m.got||m.na?"":'<span class="bar"><i style="width:'+(m.p*100)+'%"></i></span>')+'</span></div>';
  document.getElementById("a-list").innerHTML =
    '<h2 class="label">/coming-up</h2><div class="card">' +
      (near.length ? near.map(render).join("") : '<p class="dim small" style="margin:0">All done.</p>') +
    '</div>' +
    '<h2 class="label">/earned <span class="pill">'+got.length+'</span></h2><div class="card">' +
      (got.length ? got.reverse().map(render).join("") :
        '<p class="dim small" style="margin:0">Nothing yet. The first one is one session away.</p>') +
    '</div>';
}

/* ============================================================
   NAV + UTIL
   ============================================================ */
export function show(id){
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  window.scrollTo(0,0);
  if(id === "s-stats") paintStats();
  if(id === "s-ach") paintAch();
  if(id === "s-home") paintHome();
  if(id === "s-set"){
    document.getElementById("cfg-bw").value = hasBw(store.db) ? store.db.bw : "";
    document.getElementById("cfg-plank").value = store.db.targets.plank;
  }
}
export function mmss(s){ return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0"); }
let tt = null;
export function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2200);
}

export function initUi(){
  document.getElementById("st-mode").onclick = () => {
    stMode = stMode === "total" ? "sets" : "total"; paintStats();
  };
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));
}
