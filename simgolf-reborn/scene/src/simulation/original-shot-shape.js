// 0x42536b–0x425582. Final draw/fade setup after earlier launch planning.
export function originalShotShape({heading,angularOffset,speed,referenceSpeed,strength,curve,actorFlags,activeActor,shotType}) {
 if(![heading,angularOffset,speed,referenceSpeed,strength,curve,actorFlags,shotType].every(Number.isInteger)||
 heading<0||heading>0xffffffff||angularOffset< -2147483648||angularOffset>2147483647||speed<0||speed>100000||
 referenceSpeed<0||referenceSpeed>100000||strength<0||strength>330||typeof activeActor!=='boolean')throw Error('Invalid original shot shape.');
 actorFlags=(actorFlags&~2)>>>0;
 let curveOffset=0,maximum=referenceSpeed;
 if(curve===1||curve===-1){
  heading=(heading+curve*0x15555554)>>>0;
  if(actorFlags&0x80)heading=(heading-curve*0x5555555)>>>0;
  if(activeActor&&((curve===1&&angularOffset>0)||(curve===-1&&angularOffset<0)))angularOffset=Math.trunc(angularOffset/2);
  const boosted=referenceSpeed+Math.trunc((referenceSpeed<<4)/(400-strength));
  speed=strength>=300?boosted:speed+Math.trunc((speed<<4)/((strength<250?330:400)-strength));
  shotType=curve;curveOffset=curve===1?-0x239a955:0x239a955;maximum=999999;
 }
 return {heading,angularOffset,speed:Math.max(0,Math.min(maximum,speed)),actorFlags,shotType,curveOffset};
}
