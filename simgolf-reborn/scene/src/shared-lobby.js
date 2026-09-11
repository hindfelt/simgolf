import './shared-lobby.css';
import {playerStorage} from './account.js';
export function mountSharedLobby(dialog,request,player,status){
 const section=document.createElement('details');section.id='shared-courses';section.style.overflowWrap='anywhere';
 section.innerHTML='<summary>Shared courses</summary><p>Build together as owner or editor, or watch as a spectator. Shared golf tournaments are still being built.</p><p>Shared resorts keep running when you close the browser.</p><p>Your player ID: <code class="player-id"></code></p><form class="create-course"><label>New shared course name <input maxlength="80" required></label><button>Create shared course</button></form><button class="refresh-courses">Refresh courses</button><div class="course-list"></div>';
 section.querySelector('.player-id').textContent=player.id;dialog.append(section);
 const library=document.createElement('details');library.innerHTML='<summary>Published courses</summary><p>Practise a fixed course version made by another player. This is local practice; online tournament scoring is still being built.</p><button class="refresh-published">Refresh published courses</button><div class="published-list"></div>';section.append(library);
 async function loadPublished(){
  try{
   const {courses}=await request('/api/published-courses'),list=library.querySelector('.published-list');list.replaceChildren();
   if(!courses.length)list.textContent='No published courses yet.';
   for(const course of courses){
    const row=document.createElement('p'),title=document.createElement('span'),button=document.createElement('button');
    title.textContent=`${course.title} · ${course.authorName} · version ${course.digest.slice(0,8)} `;
    button.textContent='Practise this version';button.onclick=async()=>{
     button.disabled=true;
     try{const version=await request('/api/published-courses/'+course.id),{importCourse}=await import('./simulation/course-package.js'),pkg=await importCourse(JSON.stringify(version.package));playerStorage().setItem(`simgolf-reborn.package.${pkg.digest}`,JSON.stringify(pkg));location.assign('/?practice='+pkg.digest);}
     catch(error){status(error.message);button.disabled=false;}
    };row.append(title,button);list.append(row);
   }
  }catch(error){status(error.message);}
 }
 library.querySelector('.refresh-published').onclick=loadPublished;library.addEventListener('toggle',()=>{if(library.open)void loadPublished();});
 async function load(){
  try{
   const {courses}=await request('/api/courses'),list=section.querySelector('.course-list');list.replaceChildren();
   if(!courses.length){list.textContent='No shared courses yet.';return;}
   for(const course of courses){
    const row=document.createElement('div');row.style.cssText='border-top:1px solid #888;padding:12px 0';
    const link=document.createElement('a');link.href='/?shared='+encodeURIComponent(course.id);link.textContent=`${course.name} · ${course.role}`;row.append(link);
    if(course.role==='owner'){
     const details=document.createElement('details');details.innerHTML='<summary>Manage access</summary><p>Ask the other player for the player ID shown in their Account panel. Give them access here, then share the course link above.</p><form><label>Player ID <input required pattern="[a-f0-9-]{36}" maxlength="36"></label><label>Access <select aria-label="Course access"><option value="editor">Editor</option><option value="spectator">Spectator</option><option value="remove">Remove access</option></select></label><button>Update access</button></form>';
     details.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=details.querySelector('button');button.disabled=true;try{const role=details.querySelector('select').value;await request(`/api/courses/${course.id}/members`,{method:'PUT',body:JSON.stringify({playerId:details.querySelector('input').value.trim(),role:role==='remove'?null:role})});status('Course access updated.');}catch(error){status(error.message);}finally{button.disabled=false;}};
     row.append(details);
     const publish=document.createElement('button'),notice=document.createElement('p');
     notice.textContent='Publishing makes a fixed playable layout available to all registered players. Your finances and live resort remain private.';publish.textContent='Publish course to all players';
     publish.onclick=async()=>{publish.disabled=true;try{const current=await request('/api/courses/'+course.id),version=await request(`/api/courses/${course.id}/publish`,{method:'POST',body:JSON.stringify({expectedRevision:current.state.protocol.revision})});status(`Published ${version.title} · version ${version.digest.slice(0,8)}. Later edits will not change this version.`);if(library.open)await loadPublished();}catch(error){status(error.message);}finally{publish.disabled=false;}};
     details.append(notice,publish);
    }
    list.append(row);
   }
  }catch(error){status(error.message);}
 }
 section.querySelector('.create-course').onsubmit=async event=>{
  event.preventDefault();const button=section.querySelector('.create-course button');button.disabled=true;
  try{const course=await request('/api/courses',{method:'POST',body:JSON.stringify({name:section.querySelector('.create-course input').value.trim()})});location.assign('/?shared='+encodeURIComponent(course.id));}
  catch(error){status(error.message+' Refresh the course list before trying creation again.');await load();}
  finally{button.disabled=false;}
 };
 section.querySelector('.refresh-courses').onclick=load;section.addEventListener('toggle',()=>{if(section.open)void load();});
}
