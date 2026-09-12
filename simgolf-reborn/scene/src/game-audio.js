import {helicopterPose} from "./rendering/helicopter-pose.js";
import {createShotSoundTracker} from './shot-sounds.js';
export function createGameAudio(host){
 const tracker=createShotSoundTracker(),voices=new Set();
 const key='fairway-baron.effects-volume';
 let volume=.4,context,loading,disposed=false,rotor;
 const buffers={};
 const files={drive:'golf-ball-hit-3.mp3',putt:'putter-contact.mp3',cup:'ball-in-cup.mp3',rotor:'helicopter-rotor.mp3'};
 try{const saved=localStorage.getItem(key);if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 const settings=document.createElement('section');settings.className='game-audio-settings';
 settings.innerHTML='<h3>Game sound</h3><label>Effects volume <input aria-label="Effects volume" type="range" min="0" max="100" step="5"><output></output></label><p><a href="/audio/credits.html" target="_blank" rel="noopener">Sound credits</a></p>';
 host.append(settings);const slider=settings.querySelector('input'),output=settings.querySelector('output');slider.value=String(volume*100);
 const render=()=>output.textContent=volume===0?'Off':`${Math.round(volume*100)}%`;render();
 const stopRotor=()=>{if(rotor){try{rotor.source.stop();}catch{}rotor.source.disconnect();rotor.gain.disconnect();rotor.pan?.disconnect();rotor=null;}};
 const silence=()=>{stopRotor();for(const source of voices){try{source.stop();}catch{}}voices.clear();};
 async function unlock(){
  if(disposed||document.hidden||volume===0)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   context??=new Audio();await context.resume();
   loading??=Promise.allSettled(Object.entries(files).filter(([kind])=>!buffers[kind]).map(async([kind,file])=>{
    const response=await fetch(`/audio/effects/${file}`);if(!response.ok)throw Error('Sound unavailable');
    buffers[kind]=await context.decodeAudioData(await response.arrayBuffer());
   })).finally(()=>{loading=null;});
   await loading;
  }catch{/* Audio restrictions never interrupt the game. */}
 }
 slider.addEventListener('input',()=>{volume=Number(slider.value)/100;try{localStorage.setItem(key,String(volume));}catch{}render();silence();void unlock();});
 const visibility=()=>{tracker.reset();if(document.hidden){silence();void context?.suspend().catch(()=>{});}else void unlock();};
 document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',visibility);
 function play(kind,position,project){
  const buffer=buffers[kind];
  if(!buffer||context?.state!=='running'||voices.size>=(rotor?3:4)||volume===0)return;
  const p=project(position);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.depth < -1||p.depth > 1)return;
  const distance=Math.hypot(p.x-.5,p.y-.5);if(distance>1)return;
  const gain=context.createGain();gain.gain.value=volume*Math.max(.05,1-distance);
  const source=context.createBufferSource();source.buffer=buffer;
  let pan;if(context.createStereoPanner){pan=context.createStereoPanner();pan.pan.value=Math.max(-1,Math.min(1,(p.x-.5)*2));source.connect(gain).connect(pan).connect(context.destination);}else source.connect(gain).connect(context.destination);
  source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();pan?.disconnect();};voices.add(source);source.start();
 }
 function updateRotor(g,project){
  const h=g.helicopter;
  if(!h||!buffers.rotor||context?.state!=='running'||volume===0){stopRotor();return;}
  const pose=helicopterPose(h,g.time),p=project(pose);
  if(pose.power<=0){stopRotor();return;}
  const distance=p?Math.hypot(p.x-.5,p.y-.5):2;
  const level=Number.isFinite(distance)&&distance<=1?volume*.65*pose.power*Math.max(0,1-distance):0;
  if(!rotor){
   if(level===0||voices.size>=4)return;
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.rotor;source.loop=true;gain.gain.value=0;
   const pan=context.createStereoPanner?.();source.connect(gain);if(pan)gain.connect(pan).connect(context.destination);else gain.connect(context.destination);
   rotor={source,gain,pan};source.start();
  }
  rotor.gain.gain.setTargetAtTime(level,context.currentTime,.12);
  if(rotor.pan&&p)rotor.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(p.x-.5)*2)),context.currentTime,.12);
 }
 const api={update(g,project,{silent=false}={}){
  const events=tracker.observe(g);
  if(disposed||document.hidden||silent){silence();return;}
  updateRotor(g,project);
  for(const e of events)play(e.kind,e.position,project);
 },dispose(){if(disposed)return;disposed=true;silence();document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',visibility);void context?.close().catch(()=>{});removeEventListener('pagehide',pageHide);removeEventListener('pageshow',pageShow);settings.remove();}};
 const pageHide=event=>{if(event.persisted){tracker.reset();silence();void context?.suspend().catch(()=>{});}else api.dispose();};
 const pageShow=event=>{if(event.persisted)void unlock();};
 addEventListener('pagehide',pageHide);addEventListener('pageshow',pageShow);return api;
}
