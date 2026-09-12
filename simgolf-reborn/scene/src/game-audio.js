import {createShotSoundTracker} from './shot-sounds.js';
export function createGameAudio(host){
 const tracker=createShotSoundTracker(),voices=new Set();
 const key='fairway-baron.effects-volume';
 let volume=.4,context,buffer,loading,disposed=false;
 try{const saved=localStorage.getItem(key);if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 const settings=document.createElement('section');settings.className='game-audio-settings';
 settings.innerHTML='<h3>Game sound</h3><label>Effects volume <input aria-label="Effects volume" type="range" min="0" max="100" step="5"><output></output></label><p><a href="/audio/credits.html" target="_blank" rel="noopener">Sound credits</a></p>';
 host.append(settings);const slider=settings.querySelector('input'),output=settings.querySelector('output');slider.value=String(volume*100);
 const render=()=>output.textContent=volume===0?'Off':`${Math.round(volume*100)}%`;render();
 const silence=()=>{for(const source of voices){try{source.stop();}catch{}}voices.clear();};
 async function unlock(){
  if(disposed||document.hidden||volume===0)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   context??=new Audio();await context.resume();
   loading??=fetch('/audio/effects/golf-ball-hit-3.mp3').then(r=>{if(!r.ok)throw Error('Sound unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).then(decoded=>buffer=decoded).catch(()=>{loading=null;});
   await loading;
  }catch{/* Audio restrictions never interrupt the game. */}
 }
 slider.addEventListener('input',()=>{volume=Number(slider.value)/100;try{localStorage.setItem(key,String(volume));}catch{}render();silence();void unlock();});
 const visibility=()=>{tracker.reset();if(document.hidden){silence();void context?.suspend().catch(()=>{});}else void unlock();};
 document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',visibility);
 function play(position,project){
  if(!buffer||context?.state!=='running'||voices.size>=4||volume===0)return;
  const p=project(position);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.depth < -1||p.depth > 1)return;
  const distance=Math.hypot(p.x-.5,p.y-.5);if(distance>1)return;
  const gain=context.createGain();gain.gain.value=volume*Math.max(.05,1-distance);
  const source=context.createBufferSource();source.buffer=buffer;
  let pan;if(context.createStereoPanner){pan=context.createStereoPanner();pan.pan.value=Math.max(-1,Math.min(1,(p.x-.5)*2));source.connect(gain).connect(pan).connect(context.destination);}else source.connect(gain).connect(context.destination);
  source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();pan?.disconnect();};voices.add(source);source.start();
 }
 const api={update(g,project,{silent=false}={}){
  const events=tracker.observe(g);
  if(disposed||document.hidden||silent){silence();return;}
  for(const e of events)play(e.position,project);
 },dispose(){if(disposed)return;disposed=true;silence();document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',visibility);void context?.close().catch(()=>{});removeEventListener('pagehide',pageHide);removeEventListener('pageshow',pageShow);settings.remove();}};
 const pageHide=event=>{if(event.persisted){tracker.reset();silence();void context?.suspend().catch(()=>{});}else api.dispose();};
 const pageShow=event=>{if(event.persisted)void unlock();};
 addEventListener('pagehide',pageHide);addEventListener('pageshow',pageShow);return api;
}
