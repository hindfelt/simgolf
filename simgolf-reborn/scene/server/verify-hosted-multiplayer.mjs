// Explicit review deployment only. Credentials come from a private fixture file;
// never point this harness at the production player database.
import {createSession} from '../src/simulation/session.js';
import {restore} from '../src/simulation/game.js';
import {RULESET_VERSION} from '../src/simulation/protocol.js';
import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://fairway-baron-multiplayer-review.hindfelt.workers.dev';
const fixture=JSON.parse(readFileSync('.wrangler/hosted-review/players.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true}),clients=[],errors=[];
const evidence={origin,startedAt:new Date().toISOString(),checks:[]};
try{
 for(const [i,p] of fixture.players.entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1440,height:1000}});
  await context.addCookies([{name:'__Host-simgolfer_session',value:p.token,domain:new URL(origin).hostname,path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const api=async(path,body)=>{const r=await context.request.fetch(origin+path,{method:body?'POST':'GET',headers:{origin,'x-csrf-token':p.csrf},...(body?{data:body}:{})});const data=await r.json();assert(r.ok(),JSON.stringify({path,status:r.status(),data}));return data;};clients.push({context,page,api});
 }
 const [a,b]=clients;
 let course=await a.api('/api/courses',{name:'Release validation '+new Date().toISOString()});
 for(const [tool,c,r] of [['tee',7,20],['green',22,10]]){
  const command=createSession(restore(JSON.stringify(course.state))).nextCommand(fixture.players[0].id,'build',{tool,c,r,brush:1,holeId:'hole-1'});
  const reply=await a.api('/api/courses/'+course.id+'/commands',command);
  assert.equal(reply.result.ok,true);course=reply.course;
 }
 const publication=await a.api('/api/courses/'+course.id+'/publish',{expectedRevision:course.state.protocol.revision});
 assert.equal(publication.ruleset,RULESET_VERSION);
 fixture.publicationId=publication.id;
 evidence.ruleset=RULESET_VERSION;
 evidence.checks.push('Fresh server-created course and publication use current gameplay rules');
 const cup=await a.api('/api/tournaments',{title:'Hosted scheduled review',publicationId:fixture.publicationId,rounds:1,capacity:2,durationHours:1,startsAt:Date.now()+75000});
 fixture.eventId=cup.id;writeFileSync('.wrangler/hosted-review/players.json',JSON.stringify(fixture),{mode:0o600});
 await b.page.goto(origin+'/?event='+cup.id);await b.page.getByRole('button',{name:'Join tournament',exact:true}).click();await b.page.getByRole('button',{name:'Leave tournament',exact:true}).waitFor();
 assert.equal((await a.api('/api/tournaments/'+cup.id)).entrants.length,2);
 const download=b.page.waitForEvent('download');await b.page.getByRole('button',{name:'Add to calendar'}).click();assert.equal((await download).suggestedFilename(),'fairway-baron-tournament.ics');
 assert.equal(await b.page.locator('#account-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
 await b.page.screenshot({path:'/tmp/hosted-multiplayer-invitation.png'});
 evidence.checks.push('Authenticated invitation acceptance on phone viewport; calendar download; no horizontal overflow');
 // No event requests or open game page during the scheduled start.
 await Promise.all(clients.map(c=>c.page.goto('about:blank')));
 console.log('Invitation and calendar passed; waiting for the scheduled background alarm.');
 while(Date.now()<cup.startsAt+6000)await new Promise(r=>setTimeout(r,Math.min(30000,cup.startsAt+6000-Date.now())));
 console.log('Scheduled time elapsed; reading hosted result.');
 const started=await a.api('/api/tournaments/'+cup.id);assert.equal(started.status,'locked');assert.equal(started.endsAt,cup.startsAt+3600000);
 evidence.checks.push('Scheduled start and advertised deadline match on hosted service');
 for(const c of clients){await c.page.goto(origin+'/?tournament='+cup.id+'&round=1');await c.page.locator('#shared-status').filter({hasText:'Tournament'}).waitFor();}
 async function finish(c){let reloaded=false;
  for(let i=0;i<300;i++){
   const state=await c.page.evaluate(()=>{const g=window.__gameTest.getState(),p=g.pro,h=g.holes.find(h=>h.id===p.holeId);return {phase:p.phase,strokes:p.strokes,target:window.__gameTest.project(h.green.x,h.green.z)};});
   if(state.phase==='finished')return;
   if(state.strokes>0&&!reloaded){await c.page.reload();await c.page.locator('#shared-status').filter({hasText:'Tournament'}).waitFor();reloaded=true;}
   else if(state.phase==='address')await c.page.mouse.click(state.target.x,state.target.y);
   await new Promise(r=>setTimeout(r,500));
  }throw Error('Hosted round did not finish');
 }
 await Promise.all(clients.map(finish));
 const final=await a.api(`/api/tournaments/${cup.id}/standings`);assert.equal(final.status,'complete');assert.equal(final.standings.length,2);assert(final.standings.every(s=>s.roundsCompleted===1));
 for(const c of clients){const one=await c.api('/api/tournament-awards'),two=await c.api('/api/tournament-awards');assert.deepEqual(one,two);assert(one.awards.some(x=>x.id===cup.id));}
 evidence.checks.push('Two independent hosted rounds completed, survived reload, sealed final standings and retained repeatable account medals');evidence.standings=final.standings.map(({name,rank,strokes})=>({name,rank,strokes}));assert.deepEqual(errors,[]);evidence.checks.push('No browser page errors');
 console.log(JSON.stringify(evidence,null,2));
}finally{evidence.finishedAt=new Date().toISOString();evidence.browserErrors=errors;writeFileSync('/tmp/hosted-multiplayer-evidence.json',JSON.stringify(evidence,null,2));await browser.close();}
