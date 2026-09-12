import * as THREE from 'three';
import {createGame} from './simulation/game.js';
import {buildLandscape,setLandscapeState} from './landscape.js';
import {buildClubhouse,buildBridge} from './architecture.js';
import {buildFlora} from './flora.js';
import {buildCourseView} from './rendering/course.js';
import {buildOcean} from './rendering/ocean.js';
import {coastalPreview} from './rendering/coastal-preview.js';
let renderer,scene;
try{
 const params=new URLSearchParams(location.search),seed=Number(params.get('seed')),style=params.get('landscape'),environment=params.get('environment');
 const game=createGame(seed,style,environment),ground=coastalPreview(game);
 setLandscapeState(ground);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x83917a);
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 document.body.prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe2ebdf,0x6f7552,1.65));
 const sun=new THREE.DirectionalLight(0xffe4b2,2.3);sun.position.set(-48,80,-38);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-88,right:88,top:88,bottom:-88,near:1,far:210});sun.shadow.normalBias=.045;sun.shadow.bias=-.00006;scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight(0xc8d9e5,.4);fill.position.set(50,35,80);scene.add(fill);
 const terrain=buildLandscape(scene,()=>{});terrain.reshape();
 buildClubhouse(scene).scale.setScalar(.65);
 const bridge=buildBridge(scene);bridge.visible=!game.starterBridgeRemoved;
 const flora=buildFlora(scene,{editableWater:true,coastal:style==='coast',environment});flora.update(ground);
 const ocean=buildOcean(scene);ocean.update(ground);
 const course=buildCourseView(scene);course.update(game,0,[]);
 const camera=new THREE.OrthographicCamera(-60,60,45,-45,.1,400);
 const target=new THREE.Vector3(-1,0,5),initialAngle=Math.atan2(-52,124),radius=Math.hypot(52,124);
 let angle=initialAngle,zoom=1;
 function render(){
  const aspect=innerWidth/innerHeight,span=Math.max(51,40/aspect);
  camera.position.copy(target).add(new THREE.Vector3(Math.sin(angle)*radius,105,Math.cos(angle)*radius));camera.lookAt(target);camera.zoom=zoom;
  document.querySelector("#zoom-in").disabled=zoom>=2;document.querySelector("#zoom-out").disabled=zoom<=.75;
  camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera);
 }
 for(const [id,action] of Object.entries({
  'rotate-left':()=>angle-=Math.PI/4,
  'rotate-right':()=>angle+=Math.PI/4,
  'zoom-in':()=>zoom=Math.min(2,zoom+.25),
  'zoom-out':()=>zoom=Math.max(.75,zoom-.25),
  'reset-view':()=>{angle=initialAngle;zoom=1;},
 }))document.getElementById(id).addEventListener('click',()=>{action();render();});
 render();document.querySelector('#status').remove();
 parent.postMessage({type:'terrain-preview-ready',query:location.search},location.origin);
 addEventListener('resize',render);
 addEventListener('pagehide',()=>{scene.traverse(node=>{node.geometry?.dispose();for(const m of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}});renderer.dispose();renderer.forceContextLoss();},{once:true});
}catch(error){document.querySelector('#status').textContent='The 3D preview could not load. Try another terrain or reload.';console.error(error);}
