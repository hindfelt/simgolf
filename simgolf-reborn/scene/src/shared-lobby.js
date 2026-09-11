import './shared-lobby.css';
export function mountSharedLobby(dialog,request,player,status){
 const section=document.createElement('details');section.id='shared-courses';section.style.overflowWrap='anywhere';
 section.innerHTML='<summary>Shared courses</summary><p>Build together as owner or editor, or watch as a spectator. Shared golf tournaments are still being built.</p><p>Shared resorts keep running when you close the browser.</p><p>Your player ID: <code class="player-id"></code></p><form class="create-course"><label>New shared course name <input maxlength="80" required></label><button>Create shared course</button></form><button class="refresh-courses">Refresh courses</button><div class="course-list"></div>';
 section.querySelector('.player-id').textContent=player.id;dialog.append(section);
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
