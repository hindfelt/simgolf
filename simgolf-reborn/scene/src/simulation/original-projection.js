import {originalProjectionTable as table} from './original-projection-table.js';
// Original 0x466b40 / 0x466b80 and their 0x4913e0 interpolation core.
// z is the cosine component: map callers subtract it from their z origin.
export function originalProjection(heading,radius) {
 if(!Number.isInteger(heading)||heading<0||heading>0xffffffff||!Number.isInteger(radius)||radius< -0x80000000||radius>0x7fffffff)
   throw Error('Invalid original projection inputs.');
 const project=angle=>{
   let length=radius;
   if(angle&0x80000000){length=-length|0;angle&=0x7fffffff;}
   if(angle&0x40000000)angle=(0x7fffffff-angle)|0;
   const index=angle>>>22,fraction=angle&0x3fffff;
   const value=table[index]+(Math.imul(table[index+1]-table[index],fraction)>>22);
   if(length<65535)return Math.imul(value,length)>>16;
   if(length<16777215)return Math.imul(value,length>>8)>>8;
   return Math.imul(value,length>>16);
 };
 return {x:project(heading),z:project((heading+0x40000000)>>>0)};
}
