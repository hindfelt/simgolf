// Seeded stepped shoreline continues across adjoining land parcels.
export function coastColumn(seed, row) {
  const phase =
    (((Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) *
    Math.PI *
    2;
  return (
    32 +
    Math.round(4 * Math.sin(row / 8 + phase) + 3 * Math.sin(row / 17 - phase) + 1.5 * Math.sin(row / 2.3 + phase))
  );
}

// Offshore parcels repeat beyond the starting property, so buying adjoining
// land reveals the continuation of the same seeded island chain.
export function coastalWater(seed, c, r, style="coast", generation=1) {
  if(generation>=2)return variedWater(seed,c,r,style);
  if(style === "island") return islandWater(seed,c,r);
  if (c < coastColumn(seed, r)) return false;
  const rowOffset = (seed >>> 0) % 5;
  const localRow = (((r - rowOffset) % 20) + 20) % 20;
  const dc = Math.abs(c - 39);
  const dr = Math.abs(localRow - 11);
  // A seven-tile-wide island has room for a five-tile green and grass collar.
  // Bevel just the corners, retaining straight, tile-aligned reaches.
  const island = dc <= 3 && dr <= 4 && dc + dr <= 6;
  return !island;
}

export const isCoastal = style => style === 'coast' || style === 'island';
// A broad starting island and two offset outer islands, rather than a repeated
// strip of identical offshore plots. Every boundary is seeded and tile aligned.
function islandWater(seed,c,r){
 const phase=((seed>>>0)%997)/997*Math.PI*2;
 const islands=[[17,19,16,19],[24,55,17,15],[38,24,5,8]];
 return !islands.some(([cx,cz,rx,rz],i)=>{
  const dx=(c-cx)/rx,dz=(r-cz)/rz;
  const edge=1+.065*Math.sin(r*.71+phase+i)+.045*Math.cos(c*.83-phase);
  return dx*dx+dz*dz<edge;
 });
}

export function islandTree(seed,c,r){
 // Staggered groves leave buildable clearings between dense palm clusters.
 const hash=((Math.imul(c+seed,73856093)^Math.imul(r,19349663))>>>0)/4294967296;
 const phase=(seed>>>0)%997/997*Math.PI*2;
 const grove=(Math.sin(c*.43+phase)+Math.cos(r*.37-phase)+2)/4;
 const shore=[[1,0],[-1,0],[0,1],[0,-1]].some(([dc,dr])=>islandWater(seed,c+dc*2,r+dr*2));
 return (c+r)%2===0&&hash<(shore?.72:.18+grove*.52);
}

// Hash every seed before drawing parameters: neighbouring seed numbers must not
// produce neighbouring phases of essentially the same map.
export function terrainRandom(seed){
 let state=seed>>>0;
 return ()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
let cachedSeed,parameters;
function terrainParameters(seed){
 if(cachedSeed===seed)return parameters;
 const rand=terrainRandom(seed),phase=rand()*Math.PI*2;
 const coast={base:23+rand()*12,amplitude:5+rand()*10,period:7+rand()*14,tilt:(rand()-.5)*.28,phase};
 const islands=Array.from({length:2+Math.floor(rand()*4)},(_,i)=>({c:34+rand()*10,r:5+i*15+rand()*8,rx:2+rand()*5,rz:3+rand()*6}));
 const tropical=[{c:16+rand()*4,r:17+rand()*5,rx:12+rand()*6,rz:14+rand()*6},
 ...Array.from({length:2+Math.floor(rand()*3)},(_,i)=>({c:12+rand()*28,r:30+i*13+rand()*8,rx:5+rand()*8,rz:5+rand()*7}))];
 cachedSeed=seed;return parameters={coast,islands,tropical};
}
function variedWater(seed,c,r,style){
 const p=terrainParameters(seed),q=p.coast;
 // Keep the clubhouse and its approach on a connected starting headland.
 if(c>=0&&c<=15&&r>=0&&r<=23)return false;
 if(style!=='island'){
  const shore=q.base+q.amplitude*Math.sin(r/q.period+q.phase)+3*Math.sin(r/3.8-q.phase)+q.tilt*(r-20);
  if(c<Math.max(16,Math.min(40,shore)))return false;
 }
 return !(style==='island'?p.tropical:p.islands).some((a,i)=>{
  const dx=(c-a.c)/a.rx,dz=(r-a.r)/a.rz;
  return dx*dx+dz*dz<1+.13*Math.sin(r*.7+q.phase+i)+.08*Math.cos(c*.8-q.phase);
 });
}
