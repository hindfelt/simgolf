import './shared-lobby.css';
import {safeDestination} from './auth-destination.js';
export function mountEarningsLobby(dialog,request,player,status){
 const invited=new URLSearchParams(safeDestination(location.pathname+location.search).split('?')[1]).get('earnings');
 const section=document.createElement('details');section.id='earnings-lobby';section.innerHTML='<summary>Earnings competitions</summary><p>Build your own course on identical land with $50,000. The highest net cash change wins, including all construction and staff costs. To qualify, keep at least one hole open and complete paid visitor play. Resorts keep running when you leave; all entrants stop at the same deadline.</p><form><label>Earnings competition title <input name="title" maxlength="80" required></label><label>Competition length <select name="duration"><option value="10">10 minutes</option><option value="30" selected>30 minutes</option><option value="60">60 minutes</option><option value="120">120 minutes</option></select></label><label>Competition player limit <input name="capacity" type="number" min="2" max="16" value="8" required></label><button>Create earnings competition</button></form><button class="refresh">Refresh earnings competitions</button><div class="events"></div>';dialog.append(section);
 const dollars=n=>n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});
 async function load(openId=invited){
  try{
   const {competitions}=await request('/api/earnings-competitions');if(openId&&!competitions.some(e=>e.id===openId))competitions.unshift(await request('/api/earnings-competitions/'+openId));
   const list=section.querySelector('.events');list.replaceChildren();if(!competitions.length)list.textContent='No earnings competitions yet.';
   for(const event of competitions){
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');summary.textContent=`${event.title} · ${event.status}`;details.append(summary,body);list.append(details);
    async function view(){try{
     const current=await request('/api/earnings-competitions/'+event.id);body.replaceChildren();summary.textContent=`${current.title} · ${current.status}`;
     const info=document.createElement('p');info.textContent=`${current.entries.length}/${current.capacity} entrants · ${current.durationMinutes} minutes. `+(current.endsAt?`Finish: ${new Date(current.endsAt).toLocaleString()}.`:'The organizer starts everyone’s clock together. A started competition cannot be cancelled.');body.append(info);
     const invitation=document.createElement('input');invitation.readOnly=true;invitation.setAttribute('aria-label','Earnings invitation link');invitation.value=new URL('/?earnings='+event.id,location.origin).href;body.append(invitation);
     const roster=document.createElement('ul');for(const entry of current.entries){const li=document.createElement('li');li.textContent=(entry.rank?entry.rank+'. ':'')+entry.name+' · '+(entry.withdrawn?'Withdrawn':entry.result?`${dollars(entry.result.netCash)} net · ${entry.result.completedHoles} paid holes${entry.result.eligible?'':' · Not qualified'}`:current.status==='registration'?'Registered':Date.now()>=current.endsAt?'Finishing simulation':'Building and earning');roster.append(li);}body.append(roster);
     const entered=current.entries.find(e=>e.id===player.id);
     if(entered&&!entered.withdrawn&&['running','complete'].includes(current.status)){const link=document.createElement('a');link.textContent=current.status==='complete'?'View my finished course':'Open my competition course';link.href='/?shared='+entered.courseId;body.append(link);}
     const actions=current.status==='registration'?(current.ownerId===player.id?[['start','Start earnings competition'],['cancel','Cancel earnings registration']]:[entered?['leave','Leave earnings competition']:['join','Join earnings competition']]):[];
     for(const[action,label]of actions){const button=document.createElement('button');button.textContent=label;button.disabled=action==='start'&&current.entries.length<2;button.onclick=async()=>{button.disabled=true;try{await request(`/api/earnings-competitions/${event.id}/${action}`,{method:'POST',body:'{}'});status('Earnings competition updated.');await view();}catch(error){status(error.message);button.disabled=false;}};body.append(button);}
    }catch(error){status(error.message);}}
    details.addEventListener('toggle',()=>{if(details.open)void view();});if(event.id===openId)details.open=true;
   }
  }catch(error){status(error.message);}
 }
 section.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;try{const created=await request('/api/earnings-competitions',{method:'POST',body:JSON.stringify({title:form.elements.title.value,durationMinutes:Number(form.elements.duration.value),capacity:Number(form.elements.capacity.value)})});status('Earnings competition created.');await load(created.id);}catch(error){status(error.message+' Refresh before trying creation again.');}finally{button.disabled=false;}};
 section.querySelector('.refresh').onclick=()=>load();section.addEventListener('toggle',()=>{if(section.open)void load();});if(invited){dialog.showModal();section.open=true;}
}
