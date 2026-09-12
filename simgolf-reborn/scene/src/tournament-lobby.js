import {safeDestination} from './auth-destination.js';
import './shared-lobby.css';
export function mountTournamentLobby(dialog,request,player,status){
 const invited=new URLSearchParams(safeDestination(location.pathname+location.search).split('?')[1]).get('event');
 const section=document.createElement('details');section.id='tournament-lobby';
 section.innerHTML='<summary>Tournament registration</summary><p>Online stroke-play preview. Everyone uses the same starting skills; thinking time pauses between shots. Events keep a fixed published course and accept one entry per account. Event names and rosters are visible to registered players.</p><form><label>Tournament title <input name="title" maxlength="80" required></label><label>Published course <select name="course" aria-label="Published course" required></select></label><label>Rounds <select name="rounds"><option>1</option><option>2</option><option>3</option><option>4</option></select></label><label>Playing window <select name="duration"><option value="24">1 day</option><option value="72">3 days</option><option value="168" selected>7 days</option><option value="336">14 days</option></select></label><label>Player limit <input name="capacity" type="number" min="2" max="64" value="16" required></label><button>Create registration</button></form><button class="refresh-tournaments">Refresh tournaments</button><div class="tournament-list"></div>';
 dialog.append(section);
 const courseSelect=section.querySelector('[name="course"]'),moreCourses=document.createElement('button');
 moreCourses.type='button';moreCourses.textContent='Load more published courses';moreCourses.hidden=true;
 courseSelect.closest('label').after(moreCourses);
 let courseCursor=null,courseGeneration=0;
 function appendCourses(courses){
  const seen=new Set([...courseSelect.options].map(option=>option.value));
  for(const course of courses){if(seen.has(course.id))continue;seen.add(course.id);const option=document.createElement('option');option.value=course.id;option.textContent=`${course.title} · ${course.authorName||'Course author'} · ${course.digest.slice(0,8)}`;courseSelect.append(option);}
 }
 moreCourses.onclick=async()=>{
  const generation=courseGeneration;moreCourses.disabled=true;
  try{
   const page=await request('/api/published-courses?cursor='+encodeURIComponent(courseCursor));
   if(generation!==courseGeneration)return;
   appendCourses(page.courses);courseCursor=page.nextCursor||null;moreCourses.hidden=!courseCursor;
   status(`${courseSelect.options.length} published courses available.`);
  }catch(error){if(generation===courseGeneration)status(error.message);}
  finally{if(generation===courseGeneration)moreCourses.disabled=false;}
 };
 async function load(){
  const generation=++courseGeneration;moreCourses.disabled=true;
  try{
   const [coursePage,{tournaments}]=await Promise.all([request('/api/published-courses'),request('/api/tournaments')]);
   if(generation!==courseGeneration)return;
   const {courses}=coursePage;courseCursor=coursePage.nextCursor||null;moreCourses.hidden=!courseCursor;
   if(invited&&!tournaments.some(e=>e.id===invited)){const event=await request('/api/tournaments/'+invited);tournaments.unshift({...event,entrants:event.entrants.length});}
   const previous=courseSelect.value,selected=courseSelect.selectedOptions[0]?.cloneNode(true);courseSelect.replaceChildren();
   appendCourses(courses);
   if(selected&&!courses.some(c=>c.id===previous))courseSelect.append(selected);
   if(previous)courseSelect.value=previous;
   section.querySelector('form button:not([type="button"])').disabled=!courseSelect.options.length;
   const list=section.querySelector('.tournament-list');list.replaceChildren();if(!tournaments.length)list.textContent='No tournaments yet.';
   for(const event of tournaments){
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');summary.textContent=`${event.title} · ${event.entrants}/${event.capacity} · ${event.status}`;details.append(summary,body);list.append(details);
    async function view(){
     try{
      const current=await request('/api/tournaments/'+event.id);body.replaceChildren();
      summary.textContent=`${current.title} · ${current.entrants.length}/${current.capacity} · ${current.status}`;
      const info=document.createElement('p');info.textContent=`${current.rounds} ${current.rounds===1?'round':'rounds'} · course version ${current.courseDigest.slice(0,8)}. ${current.status==='complete'?'This event is complete. Results are permanent.':current.status==='locked'?'Registration closed. Entrants can play or resume their rounds.':current.status==='cancelled'?'This event is cancelled.':'Registration is open.'}`;body.append(info);const deadline=document.createElement('p');deadline.textContent=current.endsAt?`Finish and save all rounds by ${new Date(current.endsAt).toLocaleString()}. Unfinished entrants receive no placing.`:`Playing window: ${current.durationHours/24} days after registration closes. Finish and save all rounds before the deadline; unfinished entrants receive no placing.`;body.append(deadline);
      const invitation=document.createElement('input'),copy=document.createElement('button');invitation.readOnly=true;invitation.setAttribute('aria-label','Tournament invitation link');invitation.value=new URL('/?event='+event.id,location.origin).href;copy.textContent='Copy invitation link';copy.onclick=async()=>{try{await navigator.clipboard.writeText(invitation.value);status('Invitation link copied. Players sign in and choose Join tournament.');}catch{invitation.focus();invitation.select();status('Select and copy the invitation link above.');}};body.append(invitation,copy);
      const roster=document.createElement('ul');for(const entry of current.entrants){const li=document.createElement('li');li.textContent=entry.name+(entry.withdrawn?(entry.withdrawalReason==='deadline'?' · deadline missed':' · withdrawn'):entry.suspended?' · suspended':'');roster.append(li);}body.append(roster);
      const entered=current.entrants.some(p=>p.playerId===player.id);
      if(['locked','complete'].includes(current.status)){
       const scores=await request(`/api/tournaments/${event.id}/standings`),summary=document.createElement('p');summary.textContent=scores.status==='complete'?'Final results — equal totals share a place.':'Scores below cover completed rounds.';body.append(summary);
       for(const score of scores.standings){const line=document.createElement('p');line.textContent=`${score.rank?score.rank+'. ':''}${score.name}${score.withdrawn?(score.withdrawalReason==='deadline'?' (deadline missed)':' (withdrawn)'):''}: ${score.roundsCompleted}/${scores.rounds} rounds · ${score.roundsCompleted?score.strokes:'—'} strokes`;body.append(line);}
       if(entered&&!scores.standings.find(p=>p.id===player.id)?.withdrawn){const score=scores.standings.find(p=>p.id===player.id),round=Math.min(current.rounds,score.roundsCompleted+1),play=document.createElement('button');play.textContent=score.roundsCompleted===current.rounds?'Review final round':`Play / resume round ${round}`;play.onclick=()=>location.assign(`/?tournament=${event.id}&round=${round}`);body.append(play);
        if(score.roundsCompleted<current.rounds){
         const withdraw=document.createElement('button');withdraw.textContent='Withdraw from tournament';
         withdraw.onclick=()=>{
          withdraw.disabled=true;const confirmation=document.createElement('div'),message=document.createElement('p'),confirm=document.createElement('button'),keep=document.createElement('button');
          message.textContent='Withdraw permanently from this event? Your completed scorecards remain visible, but you cannot resume or receive a placing. Other entrants can continue.';
          confirm.textContent='Confirm withdrawal';keep.textContent='Keep playing';confirmation.append(message,confirm,keep);body.append(confirmation);
          keep.onclick=()=>{confirmation.remove();withdraw.disabled=false;};
          confirm.onclick=async()=>{confirm.disabled=true;keep.disabled=true;try{await request(`/api/tournaments/${event.id}/withdraw`,{method:'POST',body:'{}'});status('You withdrew from the tournament.');await view();}catch(error){status(error.message);confirm.disabled=false;keep.disabled=false;}};
         };body.append(withdraw);
        }
       }
      }
      const actions=current.ownerId===player.id?(['cancelled','complete'].includes(current.status)?[]:current.status==='locked'?[['cancel','Cancel tournament']]:[['lock','Close registration'],['cancel','Cancel tournament']]):current.status==='registration'?[entered?['leave','Leave tournament']:['join','Join tournament']]:[];
      for(const[action,label]of actions){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{button.disabled=true;try{await request(`/api/tournaments/${event.id}/${action}`,{method:'POST',body:'{}'});status('Tournament registration updated.');await view();}catch(error){status(error.message);button.disabled=false;}};body.append(button);}
     }catch(error){status(error.message);}
    }
    details.addEventListener('toggle',()=>{if(details.open)void view();});if(event.id===invited)details.open=true;
   }
  }catch(error){status(error.message);}finally{if(generation===courseGeneration)moreCourses.disabled=false;}
 }
 section.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button:not([type="button"])');button.disabled=true;
  try{await request('/api/tournaments',{method:'POST',body:JSON.stringify({title:form.elements.title.value,publicationId:form.elements.course.value,rounds:Number(form.elements.rounds.value),capacity:Number(form.elements.capacity.value),durationHours:Number(form.elements.duration.value)})});status('Tournament registration created.');await load();}
  catch(error){status(error.message+' Refresh the tournament list before retrying creation.');button.disabled=false;}
 };
 section.querySelector('.refresh-tournaments').onclick=load;section.addEventListener('toggle',()=>{if(section.open)void load();});if(invited){dialog.showModal();section.open=true;}
}
