import {loginLocation} from './auth-destination.js';
let current=null;
export function signedInAccount(){return current;}
export async function accountRequest(path,options={}){
 if(!current)throw Error('Sign in to use shared courses.');
 const response=await fetch(path,{...options,headers:{'content-type':'application/json','x-csrf-token':current.csrf,'x-player-id':current.user.id,...options.headers}});
 const body=await response.json();if(!response.ok){const error=Error(body.error||'Request failed.');error.status=response.status;throw error;}return body;
}
export function accountStorage(storage,id){
 if(!id)return storage;
 const prefix=`simgolfer.player.${id}.`;
 return {getItem:k=>storage.getItem(prefix+k),setItem:(k,v)=>storage.setItem(prefix+k,v),removeItem:k=>storage.removeItem(prefix+k)};
}
export function playerStorage(){return accountStorage(localStorage,current?.user.id);}
export async function requireAccount(){
 if(import.meta.env.DEV && import.meta.env.VITE_AUTH_REQUIRED!=='true')return null;
 const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});
 if(response.status===401){location.replace(loginLocation(location.pathname+location.search));await new Promise(()=>{});}
 if(!response.ok)throw Error('Account service unavailable. Reload to try again.');
 current=await response.json();if(!current.user?.id)throw Error('Please sign in again.');
 return current;
}
export function mountAccount({storage=playerStorage(),testing=false,shared=false}={}){
 if(!current)return;
 const button=document.createElement('button');button.id='player-account';button.textContent='Account';
 document.querySelector('.top-actions')?.append(button);
 const dialog=document.createElement('dialog');dialog.id='account-dialog';
 dialog.innerHTML=`<form method="dialog"><button class="close" aria-label="Close account">×</button></form><h2>Your player account</h2><p id="account-name"></p><p>Your local games are kept separately for this account. Cloud saves let you continue on another device.</p><button id="cloud-load">Load cloud course</button> <button id="cloud-save">Save course to cloud</button><p id="account-status" role="status"></p><details><summary>Bring in an older course</summary><p>If this browser has your course from before accounts, import a copy into this account. This replaces the current local course with a copy; the current save is backed up. Your original save stays unchanged.</p><button id="account-import">Import this browser’s old course</button></details><h3>Connect another sign-in</h3><p>Connect providers here to keep the same player account.</p><div id="account-links"></div><hr><button id="account-logout">Sign out</button><details><summary>Delete account</summary><p>This permanently removes your account and cloud saves.</p><label>Type DELETE <input id="delete-confirm" autocomplete="off"></label><button id="delete-account">Delete account permanently</button></details>`;
 document.body.append(dialog);dialog.querySelector('#account-name').textContent=current.user.name;
 if(testing)dialog.querySelector('h2').textContent='Your player account · Playtesting copy';
 button.onclick=()=>dialog.showModal();const status=message=>dialog.querySelector('#account-status').textContent=message;
 const key='simgolf-reborn.course.v1',endpoint=testing?'/api/saves/testing-course':'/api/saves/course',returnTo=testing?'/?testing=1':'/';let revision=storage.getItem("simgolfer.cloud-revision");revision=revision===null?null:Number(revision);
 const call=accountRequest;
 import('./shared-lobby.js').then(({mountSharedLobby})=>mountSharedLobby(dialog,call,current.user,status)).catch(()=>status('Shared courses could not be loaded.'));
 import('./tournament-lobby.js').then(({mountTournamentLobby})=>mountTournamentLobby(dialog,call,current.user,status)).catch(()=>status('Tournament registration could not be loaded.'));
 if(shared){for(const id of ['cloud-load','cloud-save'])dialog.querySelector('#'+id).hidden=true;dialog.querySelector('#account-import').closest('details').hidden=true;}
 if(current.user.role==='admin')import('./account-admin.js').then(({mountAdministration})=>mountAdministration(dialog,call,status)).catch(()=>status('Administration could not be loaded.'));
 fetch('/api/auth/providers').then(r=>r.json()).then(data=>{
  for(const provider of data.providers||[]){if(provider.id==='email')continue;const link=document.createElement('button');link.textContent=`Connect ${provider.name}`;link.onclick=async()=>{try{const result=await call(`/api/auth/${provider.id}/link?returnTo=${encodeURIComponent(location.pathname+location.search)}`,{method:'POST',body:'{}'});location.assign(result.url);}catch(e){status(e.message);}};dialog.querySelector('#account-links').append(link);}
 }).catch(()=>status('Sign-in options could not be loaded.'));
 dialog.querySelector('#cloud-save').onclick=async()=>{try{
  const raw=storage.getItem(key);if(!raw)throw Error('Save your course from the club menu first.');
  if(revision===null){const remote=await call(endpoint);if(remote.revision>0)throw Error('A cloud course already exists. Load it before overwriting it.');revision=0;}
  const result=await call(endpoint,{method:'PUT',headers:{'if-match':String(revision)},body:raw});revision=result.revision;storage.setItem("simgolfer.cloud-revision",String(revision));status('Course saved to your account.');
 }catch(e){status(e.message);}};
 dialog.querySelector('#cloud-load').onclick=async()=>{try{
  const remote=await call(endpoint);if(!remote.data)throw Error('No cloud course has been saved yet.');
  const {restore,serialize}=await import('./simulation/game.js');const raw=serialize(restore(JSON.stringify(remote.data)));
  const prior=storage.getItem(key);if(prior)storage.setItem(key+'.previous',prior);storage.setItem(key,raw);storage.setItem("simgolfer.cloud-revision",String(remote.revision));location.assign(returnTo);
 }catch(e){status(e.message);}};
 dialog.querySelector('#account-import').onclick=async()=>{try{
  const raw=localStorage.getItem(key);if(!raw)throw Error('No older course was found in this browser.');
  const {restore,serialize}=await import('./simulation/game.js');const next=serialize(restore(raw));const prior=storage.getItem(key);if(prior)storage.setItem(key+".previous",prior);storage.setItem(key,next);location.assign(returnTo);
 }catch(e){status(e.message);}};
 dialog.querySelector('#account-logout').onclick=async()=>{try{await call('/api/auth/logout',{method:'POST',body:'{}'});location.replace(loginLocation(location.pathname+location.search));}catch(e){status(e.message);}};
 dialog.querySelector('#delete-account').onclick=async()=>{try{
  if(dialog.querySelector('#delete-confirm').value!=='DELETE')throw Error('Type DELETE to confirm.');
  await call('/api/account',{method:'DELETE',body:JSON.stringify({confirm:'DELETE'})});
  const prefix=`simgolfer.player.${current.user.id}.`;for(const k of Object.keys(localStorage))if(k.startsWith(prefix))localStorage.removeItem(k);
  location.replace(loginLocation(location.pathname+location.search));
 }catch(e){status(e.message);}};
 // Fail closed on expiry, logout in another tab, or a change of account.
 setInterval(async()=>{try{const response=await fetch('/api/auth/me',{cache:'no-store'});if(!response.ok){location.replace(loginLocation(location.pathname+location.search));return;}const result=await response.json();if(result.user?.id!==current.user.id)location.reload();}catch{location.replace(loginLocation(location.pathname+location.search));}},60000);
}
