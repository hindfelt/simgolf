export function mountAdministration(dialog,call,status){
 const section=document.createElement('details');section.innerHTML='<summary>Player administration</summary><label>Find a player <input type="search" maxlength="100"></label><button class="search-players">Search</button><div class="admin-players"></div><button class="more-players">Next page</button>';
 dialog.append(section);let offset=0;
 async function load(){try{
  const result=await call(`/api/admin/players?q=${encodeURIComponent(section.querySelector('input').value)}&offset=${offset}`),list=section.querySelector('.admin-players');list.replaceChildren();
  for(const player of result.players){const row=document.createElement('div');row.style.cssText='padding:12px 0;border-bottom:1px solid #777';
   const label=document.createElement('p');label.textContent=`${player.name} · ${player.email} · ${player.role}${player.disabled_at?' · suspended':''}`;row.append(label);
   for(const operation of [player.disabled_at?'restore':'suspend','revoke-sessions']){const button=document.createElement('button');button.textContent={restore:'Restore account',suspend:'Suspend account','revoke-sessions':'Sign out all devices'}[operation];button.onclick=async()=>{button.disabled=true;try{await call(`/api/admin/players/${player.id}/${operation}`,{method:'POST',body:'{}'});status('Account updated.');await load();}catch(e){status(e.message);button.disabled=false;}};row.append(button);}list.append(row);
  }
  section.querySelector('.more-players').disabled=result.players.length<50;
 }catch(e){status(e.message);}}
 section.querySelector('.search-players').onclick=()=>{offset=0;load();};section.querySelector('.more-players').onclick=()=>{offset+=50;load();};
 section.addEventListener('toggle',()=>{if(section.open)load();});
}
