import {GRID} from '../simulation/world.js';
import {STARTING_ROWS} from '../simulation/land-purchase.js';

// A relief view of the same tile and elevation data used to start the course.
export function drawTerrainPreview(canvas,map,environment='parklands') {
 const ctx=canvas.getContext('2d'),w=720,h=460;canvas.width=w;canvas.height=h;
 const desert=environment==='desert',tropical=environment==='tropical';
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#254e40');bg.addColorStop(1,'#112b25');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const sx=7.1,sy=3.7,ox=350,oy=72;
 const point=(c,r,e=0)=>[ox+(c-r)*sx,oy+(c+r)*sy-e*5];
 function poly(points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
 const height=(c,r)=>map.tiles[r*GRID.width+c]?.type==='water'?0:(map.elevation?.[r*GRID.width+c]||0);
 for(let r=0;r<STARTING_ROWS;r++)for(let c=0;c<GRID.width;c++){
  const k=r*GRID.width+c,type=map.tiles[k]?.type,e=height(c,r),p=[point(c,r,e),point(c+1,r,e),point(c+1,r+1,e),point(c,r+1,e)];
  const right=c===GRID.width-1?-3:height(c+1,r),front=r===STARTING_ROWS-1?-3:height(c,r+1);
  if(e>right)poly([p[1],point(c+1,r,right),point(c+1,r+1,right),p[2]],desert?'#8e784f':'#48663c');
  if(e>front)poly([p[2],point(c+1,r+1,front),point(c,r+1,front),p[3]],desert?'#766441':'#304f33');
  const shade=((c*13+r*7)%9)*.25;
  const color=type==='water'?(tropical?'#53b9b1':'#55979c'):type==='path'?'#d7c79b':type==='bunker'?'#e5d8b2':`hsl(${desert?43:94} ${desert?34:30}% ${46+e*2.5+shade}%)`;
  poly(p,color);
  if(type==='water'&&(c+r)%5===0){const [x,y]=point(c+.5,r+.5);ctx.strokeStyle='#aedbd54d';ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.stroke();}
 }
 // Clubhouse footprint matches the reserved starting site.
 const footprint=[[3,2],[12,2],[12,9],[3,9]],base=footprint.map(([c,r])=>point(c,r)),roof=footprint.map(([c,r])=>{const p=point(c,r);return [p[0],p[1]-18];});
 poly([base[1],base[2],roof[2],roof[1]],'#d7c99d');poly([base[2],base[3],roof[3],roof[2]],'#b3b78c');poly(roof,'#ad8150');
 for(let i=0;i<5;i++){const [x,y]=point(4+i*1.4,9);ctx.fillStyle='#35594b';ctx.fillRect(x-2,y-11,3,6);}
 const label=point(7,5);ctx.strokeStyle='#efd994';ctx.beginPath();ctx.moveTo(label[0],label[1]-24);ctx.lineTo(label[0],label[1]-41);ctx.stroke();
 ctx.font='600 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff0c9';ctx.fillText('CLUBHOUSE',label[0],label[1]-48);
 ctx.textAlign='left';ctx.font='600 12px system-ui';ctx.fillStyle='#e8d499';ctx.fillText('YOUR STARTING PROPERTY',24,h-43);
 ctx.font='12px system-ui';ctx.fillStyle='#b9cfbb';ctx.fillText('Raised terrain · water · clubhouse access',24,h-22);
 canvas.setAttribute('aria-label',`Isometric ${environment} terrain preview showing elevation, water and clubhouse`);
}
