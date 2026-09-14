const mul=Math.imul,div=(n,d)=>Math.trunc((n|0)/d),i32=n=>n|0;
// Complete 0x42f270 projection with explicit original terrain-height queries.
export function originalScreenProjection(q,map){
 if(![0,2,4,6].includes(q.rotation))throw Error('Unsupported original projection orientation.');
 let cx=mul(i32(q.x-(q.cameraX<<10)-512),q.scale)>>7;
 let cz=mul(i32(q.z-(q.cameraZ<<10)-512),q.scale)>>7;
 if(q.width===1024){cx=div(mul(cx,80),64);cz=div(mul(cz,52),40);}
 if(q.width===1280){cx=div(mul(cx,104),64);cz=div(mul(cz,68),40);}
 const halfX=div(q.width,2),halfY=div(q.height,2),hx=div(mul(cx,20),32),hz=div(mul(cz,20),32);
 let x,y;
 switch(q.rotation){
  case 0:x=i32(halfX+cz+mul(q.scale,8)+cx);y=i32(hz-hx+halfY);break;
  case 2:x=i32(halfX-cx+cz);y=i32(div(mul(-cx,20),32)-hz+halfY-mul(q.scale,5));break;
  case 4:x=i32(halfX-mul(q.scale,8)-cz-cx);y=i32(hx-hz+halfY);break;
  case 6:x=i32(halfX-cz+cx);y=i32(hz+hx+halfY+mul(q.scale,5));break;
 }
 const inside=()=>x>=i32(-q.margin)&&x<i32(q.width+q.margin)&&y>=-div(q.margin,2)&&y<i32(q.height+div(q.margin,2));
 if(!inside())return {x,y,visible:false};
 const c=q.x>>10,r=q.z>>10,flags=map.flagsAt(c,r);
 const adjust=h=>div(mul(mul(i32(h-3),q.heightScale),q.scale),4);
 if(!(flags&8)){
  if(flags&2)y=i32(y-adjust(map.objectHeight(c,r)));
  else if(flags&4)y=i32(y-adjust(map.storedHeight(c,r)));
  else{
   const [h5,h7,h1,h3]=[5,7,1,3].map(direction=>i32(map.cornerHeight(c,r,direction)-3));
   if(h5===h7&&h5===h1&&h5===h3)y=i32(y-div(mul(mul(q.heightScale,q.scale),h5),4));
   else{
    const rx=i32(q.x-(c<<10)),rz=i32(q.z-(r<<10));
    const left=i32(mul(1024-rx,h7)+mul(rx,h1));
    const right=i32(mul(1024-rx,h5)+mul(rx,h3));
    const blend=i32(mul(left,1024-rz)+mul(right,rz));
    const scaled=mul(mul(blend,q.heightScale),q.scale);
    y=i32(y+div(div(-div(scaled,1024),1024),4));
   }
  }
 }
 if(q.magnify){x=i32(x*2-400);y=i32(y*2-300);}
 return {x,y,visible:inside()};
}
