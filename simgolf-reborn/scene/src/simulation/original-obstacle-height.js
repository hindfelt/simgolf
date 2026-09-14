import {originalRandom} from './original-rng.js';
// 0x406e80–0x40703f. variant is the signed selector at 0x5a1f30;
// mapping it to browser landscape names requires a separate verified adapter.
export function originalObstacleHeight({terrainCode,height,variant,terrainFlags,seed}) {
 if(!Number.isInteger(terrainCode)||terrainCode< -128||terrainCode>127||
   !Number.isInteger(height)||height< -2147483648||height>2147483647||
   !Number.isInteger(variant)||variant< -128||variant>127||
   !Number.isInteger(terrainFlags)||terrainFlags<0||terrainFlags>65535)
   throw Error('Invalid original obstacle-height inputs.');
 const rng=originalRandom(seed);
 let lower=terrainCode,upper=terrainCode;
 if(terrainCode===21||terrainCode===22){lower=0;upper=(terrainFlags&31)>=5?200:0;}
 if(variant>=0&&variant<=3&&terrainCode>=13&&terrainCode<=16) {
   let base,bound;
   if(variant===3){lower=20;base=200;bound=100;}
   else if(terrainCode===16){lower=75;base=200;bound=200;}
   else if((variant===2&&terrainCode===13)||(variant!==2&&terrainCode===14)) {lower=20;base=100;bound=100;}
   else if(terrainCode===15){lower=variant===1?100:50;base=variant===1?200:100;bound=100;}
   else {lower=50;base=200;bound=100;}
   upper=base+rng.next(bound);
 }
 return {obstructed:height<upper&&height>lower,lower,upper,seed:rng.state,draws:rng.draws};
}
