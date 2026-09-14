// 0x422b65–0x422bb5: gate a single draw/straight/fade score slot.
export function originalRouteOption({score,curve,curveMask,distance}) {
 if(score>=99999)return {eligible:false,score};
 if((curve===-1&&!(curveMask&1))||(curve===1&&!(curveMask&2))||(curve!==0&&distance<=75))return {eligible:false,score:100000};
 return {eligible:true,score};
}
