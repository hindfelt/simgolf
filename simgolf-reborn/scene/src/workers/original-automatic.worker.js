import {originalAutomaticJob} from '../simulation/original-automatic-job.js';
self.onmessage=({data:{id,revision,snapshot}})=>{
 try{self.postMessage({id,revision,result:originalAutomaticJob(snapshot)});}
 catch(error){self.postMessage({id,revision,error:error instanceof Error?error.message:String(error)});}
};
