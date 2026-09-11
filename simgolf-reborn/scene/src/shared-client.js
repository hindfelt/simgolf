import {PROTOCOL_VERSION} from './simulation/protocol.js';

export function createSharedClient({snapshot,actorId,request,onSnapshot,onResult,onStatus}){
 let current=snapshot,pending=null,inFlight=false,stopped=false,timer=null;
 const endpoint=`/api/courses/${snapshot.id}`;
 function accept(course){
  if(course.id!==current.id||course.revision<current.revision)return;
  current=course;onSnapshot(course);
 }
 async function synchronize(){
  if(stopped||inFlight)return;
  inFlight=true;
  try{
   if(pending){
    const reply=await request(endpoint+'/commands',{method:'POST',body:JSON.stringify(pending)});
    accept(reply.course);
    if(reply.result.code==='catching-up'){onStatus('Catching up with the server…');return;}
    const completed=pending;pending=null;onResult(reply.result,completed);
   }else accept(await request(endpoint));
   onStatus(current.pendingTicks?'Catching up with the server…':`Shared course · ${current.role}`);
  }catch(error){
   if(pending&&[400,401,403,404,405,413].includes(error.status)){const rejected=pending;pending=null;onResult({ok:false,message:error.message},rejected);}
   onStatus(`Connection interrupted. ${pending?'Your pending edit will be retried. ':''}${error.message}`);
  }
  finally{inFlight=false;}
 }
 function schedule(){if(stopped)return;timer=setTimeout(async()=>{await synchronize();schedule();},1000);}
 return {
  get role(){return current.role;},
  nextCommand(id,type,payload={}){return {version:PROTOCOL_VERSION,actorId:id,sequence:(current.state.protocol.clients.find(c=>c.id===id)?.sequence||0)+1,expectedRevision:current.state.protocol.revision,type,payload};},
  execute(command){
   if(stopped)return {ok:false,message:'The shared connection is closed.'};
   if(command.actorId!==actorId)return {ok:false,message:'This command belongs to another player.'};
   if(current.role==='spectator')return {ok:false,message:'You are viewing this course as a spectator.'};
   if(pending)return {ok:false,message:'Waiting for the server. Try again in a moment.'};
   pending=structuredClone(command);void synchronize();return {ok:false,pending:true,message:'Sending your edit to the server…'};
  },
  // The browser renders snapshots. Only the server advances simulation time.
  stepTicks(){},
  start(){if(timer!==null)return;stopped=false;void synchronize();schedule();},
  stop(){stopped=true;clearTimeout(timer);timer=null;},
  synchronize,
 };
}
