import { GRID, key, center, cellAt } from './world.js';
import { isOut } from './landforming.js';

// Tactical distance to the cup over playable ground. This guides layups;
// actual flight/collision samples still decide whether a shot is safe.
export function approachRoute(game, cup, lie) {
  const count = GRID.width * GRID.height;
  const costs = new Float64Array(count).fill(Infinity);
  const passable = new Uint8Array(count);
  const weight = new Float64Array(count);
  for (let r=0;r<GRID.height;r++) for(let c=0;c<GRID.width;c++) {
    const p=center(c,r), k=key(c,r), terrain=lie(game,p);
    passable[k]=!isOut(game,p) && !['water','blocked'].includes(terrain);
    weight[k]=['green','tee','fairway','firm'].includes(terrain)?1:1.35;
  }
  const origin=cellAt(cup.x,cup.z), start=key(origin.c,origin.r);
  if(start<0 || start>=count) return ()=>Infinity;
  const queue=[start], queued=new Uint8Array(count);costs[start]=0;queued[start]=1;
  for(let head=0;head<queue.length;head++) {
    const k=queue[head], c=k%GRID.width,r=Math.floor(k/GRID.width);queued[k]=0;
    for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc=c+dc,nr=r+dr;if(nc<0||nc>=GRID.width||nr<0||nr>=GRID.height)continue;
      const n=key(nc,nr);if(!passable[n])continue;
      const value=costs[k]+GRID.size*(weight[k]+weight[n])/2;
      if(value+1e-8<costs[n]) {costs[n]=value;if(!queued[n]){queue.push(n);queued[n]=1;}}
    }
  }
  return p=>{const c=cellAt(p.x,p.z);return c.c>=0&&c.c<GRID.width&&c.r>=0&&c.r<GRID.height?costs[key(c.c,c.r)]:Infinity;};
}
