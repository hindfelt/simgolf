import {transportSoundPoses} from './transport-sound-poses.js';
import {clubTime} from './simulation/club-day.js';
import {isCoastal} from './simulation/coast.js';
import {helicopterPose} from "./rendering/helicopter-pose.js";
import {createShotSoundTracker} from './shot-sounds.js';
export function createGameAudio(host){
 const tracker=createShotSoundTracker(),voices=new Set(),motors=new Map();
 const key='fairway-baron.effects-volume';
 let ambienceVolume=.25,shore,regional;
 const ambienceKey='fairway-baron.ambience-volume';
 try{const saved=localStorage.getItem(ambienceKey);if(saved!==null&&Number.isFinite(Number(saved)))ambienceVolume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 let volume=.4,context,loading,disposed=false,rotor,lastApplause=-Infinity;
 const buffers={};
 const files={boat:'boat-engine.mp3',plane:'plane-engine.mp3',birds:'tropical-birds.mp3',wind:'links-wind.mp3',shore:'coastal-shore.mp3',applause:'golf-applause.mp3',drive:'golf-ball-hit-3.mp3',putt:'putter-contact.mp3',cup:'ball-in-cup.mp3',rotor:'helicopter-rotor.mp3'};
 try{const saved=localStorage.getItem(key);if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 const settings=document.createElement('section');settings.className='game-audio-settings';
 settings.innerHTML='<h3>Game sound</h3><label>Effects volume <input aria-label="Effects volume" type="range" min="0" max="100" step="5"><output></output></label><label>Ambience volume <input aria-label="Ambience volume" type="range" min="0" max="100" step="5"><output></output></label><p><a href="/audio/credits.html" target="_blank" rel="noopener">Sound credits</a></p>';
 host.append(settings);const slider=settings.querySelector('input'),output=settings.querySelector('output');slider.value=String(volume*100);
 const render=()=>output.textContent=volume===0?'Off':`${Math.round(volume*100)}%`;render();
 const ambienceSlider=settings.querySelector('[aria-label="Ambience volume"]'),ambienceOutput=ambienceSlider.nextElementSibling;
 const renderAmbience=()=>{ambienceSlider.value=String(ambienceVolume*100);ambienceOutput.textContent=ambienceVolume===0?'Off':`${Math.round(ambienceVolume*100)}%`;};renderAmbience();
 const stopRegional=()=>{if(regional){try{regional.source.stop();}catch{}regional.source.disconnect();regional.gain.disconnect();regional=null;}};
 const stopShore=()=>{if(shore){try{shore.source.stop();}catch{}shore.source.disconnect();shore.gain.disconnect();shore=null;}};
 ambienceSlider.addEventListener('input',()=>{ambienceVolume=Number(ambienceSlider.value)/100;try{localStorage.setItem(ambienceKey,String(ambienceVolume));}catch{}renderAmbience();if(ambienceVolume===0){stopShore();stopRegional();}void unlock();});
 const stopRotor=()=>{if(rotor){try{rotor.source.stop();}catch{}rotor.source.disconnect();rotor.gain.disconnect();rotor.pan?.disconnect();rotor=null;}};
 const stopMotor=kind=>{const m=motors.get(kind);if(m){try{m.source.stop();}catch{}m.source.disconnect();m.gain.disconnect();m.pan?.disconnect();motors.delete(kind);}};
 const silence=()=>{for(const kind of motors.keys())stopMotor(kind);stopRegional();stopShore();stopRotor();for(const source of voices){try{source.stop();}catch{}}voices.clear();};
 async function unlock(){
  if(disposed||document.hidden||(volume===0&&ambienceVolume===0))return;
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
 function play(kind,position,project,level=1,nativePan=null){
  const buffer=buffers[kind];
  if(kind==='applause'&&(!context||context.currentTime-lastApplause<20))return;
  if(!buffer||context?.state!=='running'||voices.size+motors.size+(rotor?1:0)>=4||volume===0)return;
  const p=project(position);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.depth < -1||p.depth > 1)return;
  const distance=Math.hypot(p.x-.5,p.y-.5);if(distance>1)return;
  const gain=context.createGain();gain.gain.value=volume*level*(nativePan===null?Math.max(.05,1-distance):1);
  const source=context.createBufferSource();source.buffer=buffer;
  let pan;if(context.createStereoPanner){pan=context.createStereoPanner();pan.pan.value=nativePan??Math.max(-1,Math.min(1,(p.x-.5)*2));source.connect(gain).connect(pan).connect(context.destination);}else source.connect(gain).connect(context.destination);
  source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();pan?.disconnect();};voices.add(source);source.start();if(kind==='applause')lastApplause=context.currentTime;
 }
 function updateShore(g){
  if(!isCoastal(g.landscapeStyle)||ambienceVolume===0||!buffers.shore||context?.state!=='running'){stopShore();return;}
  if(!shore){
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.shore;source.loop=true;gain.gain.value=0;
   source.connect(gain).connect(context.destination);shore={source,gain};source.start();
  }
  shore.gain.gain.setTargetAtTime(ambienceVolume*.4,context.currentTime,.5);
 }
 function updateRegional(g){
  const kind=g.environment==='tropical'&&!clubTime(g.time??0).night?'birds':['links','desert'].includes(g.environment)?'wind':null;
  if(!kind||ambienceVolume===0||!buffers[kind]||context?.state!=='running'){stopRegional();return;}
  if(regional?.kind!==kind){
   stopRegional();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers[kind];source.loop=true;gain.gain.value=0;
   source.connect(gain).connect(context.destination);regional={source,gain,kind};source.start();
  }
  regional.gain.gain.setTargetAtTime(ambienceVolume*(kind==='birds'?.32:.22),context.currentTime,.8);
 }
 function updateRotor(g,project){
  const h=g.helicopter;
  if(!h||!buffers.rotor||context?.state!=='running'||volume===0){stopRotor();return;}
  const pose=helicopterPose(h,g.time),p=project(pose);
  if(pose.power<=0){stopRotor();return;}
  const distance=p?Math.hypot(p.x-.5,p.y-.5):2;
  const level=Number.isFinite(distance)&&distance<=1?volume*.65*pose.power*Math.max(0,1-distance):0;
  if(!rotor){
   if(level===0||voices.size+motors.size>=4)return;
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.rotor;source.loop=true;gain.gain.value=0;
   const pan=context.createStereoPanner?.();source.connect(gain);if(pan)gain.connect(pan).connect(context.destination);else gain.connect(context.destination);
   rotor={source,gain,pan};source.start();
  }
  rotor.gain.gain.setTargetAtTime(level,context.currentTime,.12);
  if(rotor.pan&&p)rotor.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(p.x-.5)*2)),context.currentTime,.12);
 }
 function updateMotors(g,project){
  const closest=new Map();
  if(volume>0&&context?.state==='running')for(const candidate of transportSoundPoses(g)){
   const p=project(candidate);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.depth < -1||p.depth>1)continue;
   const distance=Math.hypot(p.x-.5,p.y-.5);if(distance>=1)continue;
   if(!closest.has(candidate.kind)||distance<closest.get(candidate.kind).distance)closest.set(candidate.kind,{...candidate,p,distance});
  }
  for(const kind of motors.keys())if(!closest.has(kind))stopMotor(kind);
  for(const [kind,c] of closest){
   if(!buffers[kind])continue;
   if(!motors.has(kind)){
    if(voices.size+motors.size+(rotor?1:0)>=4)continue;
    const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner?.();source.buffer=buffers[kind];source.loop=true;gain.gain.value=0;
    source.connect(gain);if(pan)gain.connect(pan).connect(context.destination);else gain.connect(context.destination);motors.set(kind,{source,gain,pan});source.start();
   }
   const m=motors.get(kind);m.gain.gain.setTargetAtTime(volume*c.level*(1-c.distance),context.currentTime,.2);
   m.pan?.pan.setTargetAtTime(Math.max(-1,Math.min(1,(c.p.x-.5)*2)),context.currentTime,.2);
  }
 }
 const api={playOriginalEvents(events){
  if(disposed||document.hidden||!Array.isArray(events))return;
  // These shipped replacements cover only the verified contact/cup IDs.
  // The scheduler has already projected and randomized the events.
  const kinds={0:'drive',1:'drive',2:'drive',3:'putt',4:'cup'};
  for(const event of events){
   if(event?.address!==0x447a30||!Array.isArray(event.args)||event.args.length!==5||!event.args.every(Number.isInteger))continue;
   const [id,loudness,pan]=event.args,kind=kinds[id];if(!kind)continue;
   const balance=Math.max(-64,Math.min(63,pan));
   play(kind,null,()=>({x:.5,y:.5,depth:0}),(loudness&127)/127,balance/(balance<0?64:63));
  }
 },update(g,project,{silent=false}={}){
  const events=tracker.observe(g);
  if(disposed||document.hidden||silent){silence();return;}
  updateShore(g);
  updateRegional(g);
  updateRotor(g,project);
  updateMotors(g,project);
  for(const e of events)play(e.kind,e.position,project);
 },dispose(){if(disposed)return;disposed=true;silence();document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',visibility);void context?.close().catch(()=>{});removeEventListener('pagehide',pageHide);removeEventListener('pageshow',pageShow);settings.remove();}};
 const pageHide=event=>{if(event.persisted){tracker.reset();silence();void context?.suspend().catch(()=>{});}else api.dispose();};
 const pageShow=event=>{if(event.persisted)void unlock();};
 addEventListener('pagehide',pageHide);addEventListener('pageshow',pageShow);return api;
}
