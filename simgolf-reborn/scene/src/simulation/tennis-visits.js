// Post-round recreation is a browser adaptation; timings are provisional.
// Reservations, start time and completion belong to simulation state, never
// to render frames. One pair uses a facility at a time.
export const TENNIS_SECONDS = 24;
export function scheduleTennis(g, {connected, entrance, route}) {
  if (g.courseLocked) return;
  const ready=v=>v.paid && v.roundFinished && !v.tennisPlayed && !v.tennis &&
    (v.phase==='finished' || (v.phase==='walking' && v.afterWalk==='departed'));
  for (const f of g.facilities) {
    if(f.type!=='tennis-court' || !connected(g,f) || g.guests.some(v=>v.tennis?.facilityId===f.id))continue;
    const first=g.guests.find(v=>ready(v) && g.guests.some(p=>p!==v && ready(p) && p.pair===v.pair));
    if(!first)break;
    const second=g.guests.find(v=>v!==first && ready(v) && v.pair===first.pair);
    if(!second)continue;
    const dest=entrance(g,f);
    if(!dest)continue;
    const pair=[first,second],paths=pair.map(v=>route(g,v.pos,dest));
    if(paths.some(p=>!p))continue;
    pair.forEach((v,i)=>{
      v.tennisPlayed=true;
      v.tennis={facilityId:f.id,partnerId:pair[1-i].id,reservedAt:g.time,startedAt:null};
      v.path=paths[i];v.afterWalk='service';v.phase='walking';v.wait=0;
      v.serviceId=f.id;v.serviceContinuation='exit';
      v.comment='A little tennis together before heading home.';
    });
  }
}
export function stepTennisVisit(g,v,{connected,leave}) {
  const visit=v.tennis;
  if(!visit)return false;
  const f=g.facilities.find(f=>f.id===visit.facilityId && f.type==='tennis-court');
  const finish=(completed)=>{
    delete v.tennis;
    if(completed){f.served++;g.stats.services++;v.comment='Enjoyed that game of tennis!';}
    else v.comment='Time to head home.';
    leave(g,v,'exit');return true;
  };
  if(!f || !connected(g,f))return finish(false);
  // Complete before checking the partner: the first completion releases its
  // reservation earlier in this same tick.
  if(visit.startedAt!==null && g.time-visit.startedAt>=TENNIS_SECONDS)return finish(true);
  const partner=g.guests.find(p=>p.id===visit.partnerId && p.tennis?.facilityId===f.id && p.tennis.partnerId===v.id);
  if(!partner || g.time-visit.reservedAt>180)return finish(false);
  if(v.phase!=='service')return false;
  if(partner.phase==='service' && visit.startedAt===null){
    visit.startedAt=g.time;partner.tennis.startedAt=g.time;
  }
  v.comment=visit.startedAt===null?'Waiting for my tennis partner.':'Enjoying a game of tennis.';
  return true;
}
export function validateTennis(g,v){
  if(v.tennisPlayed!==undefined && typeof v.tennisPlayed!=='boolean')throw Error('Invalid tennis visit history.');
  const t=v.tennis;if(t===undefined)return;
  if(!t || v.pro || !v.paid || !v.roundFinished || !v.tennisPlayed ||
    !Number.isSafeInteger(t.facilityId) || !Number.isSafeInteger(t.partnerId) || t.partnerId===v.id ||
    !Number.isFinite(t.reservedAt) || t.reservedAt<0 || t.reservedAt>g.time ||
    (t.startedAt!==null && (!Number.isFinite(t.startedAt)||t.startedAt<t.reservedAt||t.startedAt>g.time)) ||
    !['walking','service'].includes(v.phase) || v.serviceId!==t.facilityId)
    throw Error('Invalid tennis reservation.');
}
