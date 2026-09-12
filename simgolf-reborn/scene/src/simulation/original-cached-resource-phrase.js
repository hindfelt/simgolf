const ctext=s=>{if(typeof s!=='string')throw Error('Original resource phrase text is unavailable.');return s.split('\0',1)[0];};
// 0x466440 cache lookup and complete cache-hit path. Misses stop before
// file loading; the caller must supply the original resource parser next.
export function originalCachedResourcePhrase(q){
 const state=structuredClone(q.state),cache=state.resourceCache;
 if(!Array.isArray(cache)||cache.length!==8)throw Error('Original resource phrase cache requires eight entries.');
 if(cache.some(r=>!r||!['fileId','section','variant'].every(k=>Number.isInteger(r[k]))))throw Error('Original resource cache keys are unavailable.');
 const index=cache.findIndex(r=>(r.fileId|0)===(q.fileId|0)&&(r.section|0)===(q.section|0)&&(r.variant|0)===(q.variant|0));
 if(index<0)return {state,next:'load'};
 const prefix=ctext(state.sourceText),text=ctext(cache[index].text),bytes=[...prefix,...text,'\0'],start=prefix.length,end=start+text.length;
 if((q.mode|0)!==-1){
  for(let at=start;at<end;at++)if(bytes[at]==='\n'){
   if((q.mode|0)===1)bytes[at]='\0';
   else{let stop=at+1;while(bytes[stop]!=='\0')stop++;const rest=bytes.slice(at+1,stop+1);for(let j=0;j<rest.length;j++)bytes[start+j]=rest[j];}
  }
 }
 state.sourceText=bytes.slice(0,bytes.indexOf('\0')).join('');return {state,next:'text'};
}
