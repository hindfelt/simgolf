// Non-putter modifier block 0x4243ad–0x424542. This returns the original
// intermediate modifier (+0x18 local), whose later use is separate.
export function originalClubDrift({angularOffset,actorClass,activeActor,level,attitude,
 club,shotCounter,driverValue,ironValue,drawValue,fadeValue,curve,mode}) {
 const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
 if(!Number.isInteger(angularOffset)||angularOffset< -2147483648||angularOffset>2147483647||
 ![actorClass,shotCounter,driverValue,ironValue,drawValue,fadeValue].every(byte)||typeof activeActor!=='boolean'||
 !Number.isInteger(level)||level<0||level>3||!Number.isInteger(attitude)||attitude< -128||attitude>127||
 !Number.isInteger(club)||club<0||club>12||!Number.isInteger(curve)||!Number.isInteger(mode))throw Error('Invalid original club drift.');
 let modifier=-3;
 if(actorClass===0)return {angularOffset,modifier};
 if(activeActor)angularOffset=(angularOffset-Math.trunc(Math.imul(3-level,angularOffset)/6))|0;
 else if((actorClass&0xe0)===0x20)angularOffset=(angularOffset+Math.trunc(Math.imul(3-level,angularOffset)/3))|0;
 else modifier=attitude-3;
 const adjust=(value,denominator)=>{angularOffset=Math.trunc(Math.imul(angularOffset,6)/denominator);modifier+=value;};
 if(club>3)adjust(ironValue,ironValue+4);
 else if(shotCounter===0)adjust(driverValue,driverValue+4);
 if(curve===1)adjust(drawValue,drawValue+3);
 else if(curve===-1)adjust(fadeValue,fadeValue+3);
 else if(curve===0&&mode!==3)adjust(3,7);
 return {angularOffset,modifier};
}
