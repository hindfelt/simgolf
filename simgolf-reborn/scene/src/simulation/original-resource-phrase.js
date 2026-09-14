import {originalCachedResourcePhrase} from './original-cached-resource-phrase.js';
const ctext=s=>{if(typeof s!=='string')throw Error('Original resource text is unavailable.');return s.split('\0',1)[0];};
// Full 0x466440, with fopen/fgets/fclose supplied as preloaded CRT read results.
// readResource returns null for open failure or an array of fgets strings.
export function originalResourcePhrase(q,readResource){
 const cached=originalCachedResourcePhrase(q);let state=cached.state;const events=[];
 if(cached.next==='text')return {state,events};
 const slot=(state.resourceCacheIndex<<16)>>16;if(slot<0||slot>=8||!Number.isInteger(state.resourceCacheIndex))throw Error('Original resource cache cursor is unavailable.');
 const target=state.resourceCache[slot];target.fileId=q.fileId|0;target.section=-2;target.variant=q.variant|0;
 const theme=(q.resourceFlags&0x10000000)?'Standard':ctext(q.themeName),path='Themes\\'+theme+'\\'+ctext(q.resourceFileNames?.[q.fileId|0]);
 events.push({kind:'open',path,mode:'rt'});if(typeof readResource!=='function')throw Error('Original resource file loader is unavailable.');
 const lines=readResource(path);if(lines===null)return {state,events};if(!Array.isArray(lines))throw Error('Expected original fgets results.');
 const append=text=>{state.sourceText=ctext(state.sourceText)+ctext(text);};
 let section=q.section|0,variant=q.variant|0,remaining=section,counter=1,processed=0,previous=q.previousLineBuffer,position=0,early=false;
 while(true){
  events.push({kind:'read',maxBytes:250});const raw=position<lines.length?lines[position++]:null;
  if(raw===null){if(section===-1&&variant!==-1&&(q.mode|0)!==1)append(previous);break;}
  if(typeof raw!=='string'||raw.length>249)throw Error('Original fgets result is invalid.');
  const line=ctext(raw);if(line.length<2){if(section===-1&&variant===-1)break;continue;}
  const trimmed=line.slice(0,-1);
  if((q.section|0)===-1){append(trimmed);early=true;break;}
  if(trimmed[0]!==' '){
   if(section===counter){append(trimmed);append('\n');section=-1;counter++;}
   else{if(section===-1&&variant!==-1){if((q.mode|0)!==0)append(previous);variant=-1;}counter++;}
  }else{
   if(section===-1){if(remaining===variant){if((q.mode|0)!==1)append(trimmed);variant=-1;}else remaining--;}
   previous=trimmed;
  }
  processed++;if(processed>200){early=true;break;}
  if(section===-1&&variant===-1)break;
 }
 events.push({kind:'close'});
 if(!early&&(q.mode|0)===-1){target.text=ctext(state.sourceText);target.section=q.section|0;state.resourceCacheIndex=(slot+1)%8;}
 return {state,events};
}
