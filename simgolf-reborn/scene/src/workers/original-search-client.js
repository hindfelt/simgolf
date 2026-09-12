// One outstanding snapshot per client. Superseding work terminates its worker
// immediately, so old course revisions cannot resolve a newer request.
export function originalSearchClient({workerUrl=new URL('./original-search.worker.js',import.meta.url)}={}) {
 let active=null,nextId=0,disposed=false;
 const cancel=()=>{
  if(!active)return;
  const job=active;active=null;job.worker.terminate();
  job.reject(new DOMException('Search cancelled.','AbortError'));
 };
 const run=(snapshot,revision)=>{
  if(disposed)return Promise.reject(new Error('Search client has been disposed.'));
  cancel();
  return new Promise((resolve,reject)=>{
   const id=++nextId,worker=new Worker(workerUrl,{type:'module'});
   active={id,worker,reject};
   const finish=(error,result)=>{
    if(active?.id!==id)return;
    active=null;worker.terminate();
    if(error)reject(error);else resolve({revision,result});
   };
   worker.onmessage=({data})=>{
    if(data.id!==id||data.revision!==revision)return;
    finish(data.error?new Error(data.error):null,data.result);
   };
   worker.onerror=event=>{event.preventDefault();finish(new Error(event.message||'Search worker failed.'));};
   try{worker.postMessage({id,revision,snapshot});}catch(error){finish(error);}
  });
 };
 return {run,cancel,dispose:()=>{cancel();disposed=true;}};
}
