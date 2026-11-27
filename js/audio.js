/* Beeps through Web Audio. Silent when the browser refuses. */

let audio = null;

export function beep(f, ms, vol){
  try{
    if(!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if(audio.state === "suspended") audio.resume();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(vol || .25, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + ms/1000);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + ms/1000);
  }catch(e){}
}
export const ding  = () => { beep(880,180); setTimeout(()=>beep(1320,260), 190); };
export const click = () => beep(660,90,.18);
