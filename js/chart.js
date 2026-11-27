/* Progress chart as an SVG string. No DOM access. */
import { EX, FULL } from "./config.js";
import { history } from "./targets.js";

/* sel is an exercise id or "__vol" for session volume; mode is "total" or "sets".
   hollow[i] is true for a session-volume point where an exercise was skipped. */
export function chartData(db, sel, mode){
  let series, hollow = null;
  if(sel === "__vol"){
    series = [db.sessions.map(s => Object.keys(s.log).reduce((a,k) =>
      a + s.log[k].reduce((p,q)=>p+q,0) * (EX[k].unit==="secs"?0:1), 0))];
    hollow = db.sessions.map(s => FULL.some(id => !s.log[id]));
  } else {
    const h = history(db, sel);
    series = mode === "total"
      ? [h.map(x => x.vals.reduce((a,b)=>a+b,0))]
      : [0,1,2].map(i => h.map(x => x.vals[i] || 0));
  }
  return hollow ? {series, hollow} : {series};
}

/* width is the container's width in pixels (0 if unknown). */
export function chartHtml(db, sel, mode, width){
  const {series, hollow} = chartData(db, sel, mode);
  const n = series[0].length;
  if(n < 2){
    return '<p class="dim small" style="margin:26px 0;text-align:center">' +
      (n === 0 ? "Nothing logged yet." : "One session in. The chart appears at two.") + '</p>';
  }
  const W = Math.min(width || 320, 520), H = 200, P = 26;
  const all = series.flat();
  const hi = Math.max.apply(null, all) * 1.12 || 1, lo = 0;
  const X = i => P + (W - P*1.4) * (n===1 ? .5 : i/(n-1));
  const Y = v => H - P - (H - P*1.8) * ((v-lo)/(hi-lo));
  const cols = ["#E0A458","#7FA88B","#C6634F"];
  let svg = '<svg width="100%" viewBox="0 0 '+W+' '+H+'" style="display:block">';
  for(let g=0; g<=2; g++){
    const y = Y(hi/1.12 * g/2);
    svg += '<line x1="'+P+'" x2="'+(W-P*.4)+'" y1="'+y+'" y2="'+y+'" stroke="#2E3346" stroke-width="1"/>';
    svg += '<text x="4" y="'+(y+4)+'" fill="#8A90A6" font-size="10" font-family="ui-monospace,monospace">'+
           Math.round(hi/1.12*g/2)+'</text>';
  }
  series.forEach((s,si) => {
    svg += '<polyline fill="none" stroke="'+cols[si]+'" stroke-width="2" stroke-linejoin="round" points="'+
           s.map((v,i) => X(i)+","+Y(v)).join(" ")+'"/>';
    s.forEach((v,i) => {
      svg += '<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.4" fill="'+(hollow && hollow[i] ? "#14161F" : cols[si])+
             '" stroke="'+cols[si]+'" stroke-width="1.6"/>';
    });
  });
  if(series.length === 1 && n >= 3){         // rolling average of the last 5
    const s = series[0], avg = [];
    for(let i=0;i<n;i++){
      const w = s.slice(Math.max(0, i-4), i+1);
      avg.push(w.reduce((a,b)=>a+b,0)/w.length);
    }
    svg += '<polyline fill="none" stroke="#6E8CA8" stroke-width="2" stroke-dasharray="5 4" points="'+
           avg.map((v,i) => X(i)+","+Y(v)).join(" ")+'"/>';
  }
  svg += '</svg>';
  return svg;
}
