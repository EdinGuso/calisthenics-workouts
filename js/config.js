/* Programme, timings, food suggestions and milestone tiers. */

/* ============================================================
   EXERCISES
   ============================================================ */
export const EX = {
  pushup: {name:"Push-ups",       unit:"reps", mode:"failure", sides:1, load:.64, spr:2.5,
           cue:"Body in one line, elbows about 45 degrees from your ribs."},
  row:    {name:"Inverted rows",  unit:"reps", mode:"failure", sides:1, load:.50, spr:2.5,
           cue:"Under a sturdy table or bar at hip height, body straight. Shoulder blades pull together before the arms bend."},
  squat:  {name:"Slow squats",    unit:"reps", mode:"failure", sides:1, load:.70, spr:4,
           cue:"Three seconds down, one second up. Heels stay down."},
  pike:   {name:"Pike push-ups",  unit:"reps", mode:"failure", sides:1, load:.75, spr:2.5,
           cue:"Hips high, head travels forward of your hands, not straight down."},
  bridge: {name:"Single-leg glute bridge", unit:"reps", mode:"capped", sides:2, load:.40, spr:3,
           cue:"One leg at a time. Drive through the heel, ribs down, do not arch.",
           step:1, ceiling:18},
  situp:  {name:"Sit-ups",        unit:"reps", mode:"failure", sides:1, load:.40, spr:2,
           cue:"Controlled down, no yanking on your neck."},
  plank:  {name:"Side plank",     unit:"secs", mode:"capped", sides:2, load:0,   spr:1,
           cue:"Stack the hips, push the floor away, do not let the bottom hip sag.",
           step:5, ceiling:60}
};
export const FULL = ["pushup","row","squat","pike","bridge","situp","plank"];
export const SETS = 3;
export const REST_SET = 20, REST_EX = 60, REST_SIDE = 10;

export const WARMUP = [
  {n:"Cat-cow",                s:45, d:"Slow, breathe with it"},
  {n:"World's greatest stretch", s:60, d:"30 seconds each side"},
  {n:"Dead bug",               s:45, d:"Lower back stays flat on the floor"},
  {n:"Glute bridges",          s:40, d:"Both legs, squeeze at the top"},
  {n:"Prone Y-T-W",            s:60, d:"Face down with light dumbbells or water bottles, slow"}
];

export const FOOD = [
  "Greek yoghurt, berries and a spoon of peanut butter.",
  "Three-egg omelette with spinach and a bit of feta.",
  "Skyr with muesli and a drizzle of honey.",
  "Scrambled eggs on rye with cottage cheese on the side.",
  "Overnight oats made with milk, topped with banana and walnuts.",
  "Cottage cheese, sliced tomato, black pepper, rye bread.",
  "Smoked salmon on rye with quark and dill.",
  "Two boiled eggs, an apple and a handful of almonds.",
  "Porridge made with milk, cinnamon, and a spoon of nut butter.",
  "Bircher müesli made with quark instead of yoghurt.",
  "Shakshuka, two eggs, bread to mop it up.",
  "Ham and cheese omelette with tomatoes.",
  "Banana, milk, oats and a scoop of whey, blended.",
  "Avocado and two poached eggs on sourdough.",
  "Quark with frozen raspberries and a spoon of maple syrup."
];

/* ============================================================
   MILESTONE TIERS
   ============================================================ */
export const REP_TIERS = [100,250,500,1000,2500,5000,10000,25000];
export const SEC_TIERS = [300,900,1800,3600,7200,18000,36000,72000];   // 5 min up to 20 hours
export const WEEK_TIERS = [1,2,4,8,12,26,52,104];
export const CHAIN_TIERS = [2,4,8,12,26,52];
export const SESS_TIERS = [1,5,10,25,50,100,250,500];
/* Roughly a tonne of load per session at the start, climbing as you do.
   The last one is years away, which is the point of it.                */
export const TON_TIERS = [
  [1000,"a small car"],
  [7000,"an African elephant"],
  [40000,"a loaded articulated lorry"],
  [150000,"a blue whale"],
  [420000,"a fully loaded 747"],
  [2500000,"an Olympic pool, filled"],
  [7300000,"the iron in the Eiffel Tower"]
];
export const HOUR_TIERS = [1,5,10,25,50,100];
