import { courseContent } from "./course-package.js";
import { validateProProfile } from "./pro-skills.js";
import roster from './pro-roster.json' with { type: 'json' };
import { originalRandom } from './original-rng.js';
import { originalChallengeOfferStakes, restoreProChallenge } from './pro-challenge.js';
import { canonical } from './protocol.js';

// The original gate is >8192 simulation ticks. Mapping to this simulation's
// 50ms tick is provisional; original wall-clock timing is not yet established.
const INTERVAL = 8193 * 0.05;
export function challengeCareer(g) {
  return g.challengeCareer ??= { version: 1, level: 0, sequence: 0,
    rng: (g.landSeed + 8317) >>> 0, nextAt: INTERVAL, offer: null, results: [] };
}
export function challengeReady(g, level) {
  // Original 0x574b18 + counter*0x208 is the par byte of hole counter+3.
  return !g.courseLocked && g.holes.filter(h => h.tee && h.green).length >= level + 3;
}
export function stepChallengeCareer(g) {
  if (g.courseLocked) return;
  const c = challengeCareer(g);
  if (c.offer || g.time < c.nextAt || !challengeReady(g,c.level)) return;
  const rng = originalRandom(c.rng);
  let chosen;
  // Original widening score window; the parsed catalog excludes malformed rows.
  // This catalog choice and isolated stream are provisional arrival adapters.
  for (let attempt = 1; !chosen; attempt++) {
    const candidate = roster.golfers[rng.next(100)];
    if (!candidate) continue;
    const score = Object.values(candidate.skillCaps).reduce((n,v)=>n+v,0)-20;
    if (Math.abs(score-5*c.level) <= Math.floor(attempt/4)) chosen = candidate;
  }
  c.rng = rng.state;
  c.offer = { id: ++c.sequence, level: c.level, professional: chosen.name,
    stakes: originalChallengeOfferStakes(c.level), status: 'offered', at: g.time };
  g.revision++;
  g.events.unshift({time:g.time,text:`${chosen.name} has challenged Gary to a match. Open Club menu to review the invitation.`});
  g.events.length = Math.min(g.events.length,100);
}
export function declineChallenge(g, id) {
  const c=challengeCareer(g);
  if (c.offer?.id !== id || c.offer.status !== 'offered') return {ok:false,message:'That invitation is no longer available.'};
  c.offer=null; c.nextAt=g.time+INTERVAL;
  return {ok:true,message:'Challenge declined. Another professional may visit later.'};
}
export function acceptChallenge(g, id, eventId, courseDigest) {
  const c=challengeCareer(g),o=c.offer;
  if (o?.id!==id || o.status!=='offered' || !challengeReady(g,c.level))
    return {ok:false,message:'This challenge is no longer available. Complete the required holes first.'};
  let layout;
  try { layout=courseContent(g); } catch(error) { return {ok:false,message:error.message}; }
  o.layout=layout;
  o.status='playing'; o.eventId=eventId; o.courseDigest=courseDigest;
  o.profile=structuredClone(g.proProfile);
  c.level++;
  return {ok:true,message:`Challenge accepted: ${o.professional}.`};
}
// Host adapter entry point: reconstruct the event and derive its result. No API
// accepts a client-supplied score or payment. Future servers must own both saves.
export async function settleCareerChallenge(g, raw) {
  const c=challengeCareer(g),o=c.offer;
  if (!o || o.status!=='playing') return {ok:false,message:'No challenge is awaiting a result.'};
  const host=await restoreProChallenge(raw),s=host.snapshot();
  const envelope=JSON.parse(host.save()),config=JSON.parse(envelope.event).config;
  const owner=config.entrants.find(p=>p.id==='local-owner');
  const rival=config.entrants.find(p=>p.id==='club-rival');
  if (canonical({...config.course.content,title:'Willow Brook'})!==canonical(o.layout) ||
      config.seed!==2002 || s.id!==o.eventId || s.courseDigest!==o.courseDigest ||
      s.residentId!=='local-owner' || s.challengerId!=='club-rival' ||
      canonical(s.stakes)!==canonical(o.stakes) || rival?.professional!==o.professional ||
      canonical(owner?.golfer.profile)!==canonical(o.profile))
    throw Error('The event does not match this accepted challenge.');
  // Read the current receipts only after async replay. A concurrent settlement
  // may already have paid these holes while this replay was in progress.
  if (c.offer!==o) return {ok:false,message:'This challenge was already settled.'};
  const paid=o.paidHoles ?? [];
  if (paid.length>s.holes.length || paid.some((h,i)=>canonical(h)!==canonical(s.holes[i])))
    throw Error('This replay contradicts hole wagers already settled.');
  const pending=s.holes.slice(paid.length),complete=s.status==='complete';
  if (!pending.length && !complete) return {ok:false,message:'No new completed hole wagers to settle.'};
  const pay=(amount,reason)=>{
    g.cash+=amount;
    g.ledger.push({id:g.ledger.length+1,time:g.time,amount,reason});
  };
  for (const h of pending)
    pay(h.residentAmount,`Pro challenge: ${o.professional}, hole ${h.number}`);
  o.paidHoles=structuredClone(s.holes);
  const delta=pending.reduce((n,h)=>n+h.residentAmount,0)+(complete?s.matchAmount:0);
  if (complete) {
    pay(s.matchAmount,`Pro challenge: ${o.professional}, match wager`);
    const won=s.matchAmount>0;
    if (!won) c.level=o.level;
    c.results.push({id:o.id,eventId:o.eventId,professional:o.professional,level:o.level,
      amount:s.residentNet,won,at:g.time});
    c.results=c.results.slice(-100);
    c.offer=null; c.nextAt=g.time+INTERVAL;
  }
  g.revision++;
  if (g.protocol) g.protocol.revision++;
  const cash=n=>`${n<0?'−':'+'}$${Math.abs(n).toLocaleString()}`;
  const message=complete
    ? `Match complete: ${cash(s.residentNet)} net; ${cash(delta)} settled now.`
    : `${pending.length} hole wager${pending.length===1?'':'s'} settled: ${cash(delta)}. Match still in progress.`;
  g.events.unshift({time:g.time,text:message}); g.events.length=Math.min(g.events.length,100);
  return {ok:true,message,complete,amount:delta};
}
export function validateChallengeCareer(g) {
  const c=g.challengeCareer;
  if (c===undefined) return;
  const validInt=n=>Number.isSafeInteger(n)&&n>=0;
  const name=n=>roster.golfers.some(p=>p.name===n);
  if (!c || c.version!==1 || !validInt(c.level) || c.level>16 ||
      !validInt(c.sequence) || !validInt(c.rng) || c.rng>0xffffffff ||
      !Number.isFinite(c.nextAt) || c.nextAt<0 || !Array.isArray(c.results) || c.results.length>100 ||
      c.results.some(r=>!validInt(r.id)||r.id>c.sequence||!name(r.professional)||!validInt(r.level)||
        typeof r.eventId!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(r.eventId)||!Number.isSafeInteger(r.amount)||typeof r.won!=='boolean'||!Number.isFinite(r.at)||r.at>g.time||r.at<0)||
      new Set(c.results.map(r=>r.eventId)).size!==c.results.length)
    throw Error('Invalid challenge career.');
  const o=c.offer;
  if (o===null) return;
  if (!o || !validInt(o.id) || o.id!==c.sequence || !validInt(o.level) ||
      !name(o.professional)||!['offered','playing'].includes(o.status)||
      !Number.isFinite(o.at)||o.at<0||o.at>g.time||
      canonical(o.stakes)!==canonical(originalChallengeOfferStakes(o.level))||
      c.level!==o.level+(o.status==='playing'?1:0)||
      (o.status==='playing' && (typeof o.eventId!=='string'||typeof o.courseDigest!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(o.eventId)||
        !/^[a-f0-9]{64}$/.test(o.courseDigest)||!o.profile||!o.layout)))
    throw Error('Invalid challenge invitation.');
  if (o.status==='playing') {
    validateProProfile(o.profile);
    const paid=o.paidHoles ?? [];
    if (!Array.isArray(paid) || paid.length>o.layout.holes.length || paid.some((h,i)=>
      !h || h.holeId!==o.layout.holes[i].id || h.number!==i+1 ||
      !Number.isSafeInteger(h.residentStrokes) || h.residentStrokes<1 ||
      !Number.isSafeInteger(h.challengerStrokes) || h.challengerStrokes<1 ||
      h.residentAmount!==Math.sign(h.challengerStrokes-h.residentStrokes)*o.stakes.perHole ||
      h.winner!==(h.residentStrokes<h.challengerStrokes?'local-owner':h.residentStrokes>h.challengerStrokes?'club-rival':null)))
      throw Error('Invalid settled challenge holes.');
  }
}
