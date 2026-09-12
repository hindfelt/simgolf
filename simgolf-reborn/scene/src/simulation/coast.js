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
export function coastalWater(seed, c, r, style="coast") {
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
