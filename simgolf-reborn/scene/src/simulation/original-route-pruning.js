// Score pruning at 0x423305–0x42338c, 0x423402–0x423492.
// Each of the 441 candidate tiles has six shot scores. The second slot also
// carries the original whole-candidate exclusion sentinel.
export function originalRoutePruning({scores,bestScore,samples,work}) {
 if(!Array.isArray(scores)||scores.length!==441||scores.some(row=>!Array.isArray(row)||row.length!==6||
   row.some(n=>!Number.isInteger(n)||n< -2147483648||n>100000))||
   !Number.isInteger(bestScore)||bestScore< -2147483648||bestScore>99999||
   ![2,4].includes(samples)||!Number.isInteger(work)||work<0||work>1000000)
   throw Error('Invalid original route pruning inputs.');
 const result=scores.map(row=>[...row]);
 const passes=[];
 let margin=128,survivors=[];
 for(;;) {
   survivors=[];
   for(let candidate=0;candidate<441;candidate++) {
     const row=result[candidate];
     if(row[1]>99999)continue;
     let excluded=0;
     for(let option=0;option<6;option++) {
       if(row[option]>=99999){excluded++;continue;}
       if(row[option]>bestScore+margin){row[option]=99999;excluded++;continue;}
       survivors.push({candidate,option});
     }
     if(excluded===6)row[1]=100000;
   }
   passes.push({margin,count:survivors.length});
   if(survivors.length<=4||margin<=16||work+survivors.length*samples*3<=250)break;
   margin=Math.trunc(margin/2);
 }
 return {scores:result,survivors,passes,margin,nextSamples:samples*2,continueSearch:survivors.length>1};
}
