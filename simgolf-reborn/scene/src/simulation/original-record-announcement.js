// Native 0x427bd4–0x427d38, after score-list insertion.
export function originalRecordAnnouncement(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],totals=structuredClone(snapshot.totals),id=state.actorId;
 const b=state.actors?.[id];
 if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original record actor unavailable.');
 const signed=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(!signed(state.courseHoleCount)||!signed(state.recordHolder)||!totals||![totals.playedStrokes,totals.playedPar,totals.completionBits].every(signed))throw Error('Original record totals unavailable.');
 const done=announced=>({state,totals,calls,announced,next:'0x427d38'});
 if(state.courseHoleCount<=2||b[0x2c]===0||state.recordHolder!==-1)return done(false);
 if(!(state.scoreList instanceof Int32Array)||state.scoreList.length!==10)throw Error('Original score list unavailable.');
 if((state.scoreList[0]!==0&&totals.playedStrokes>=state.scoreList[0])||totals.playedStrokes>totals.playedPar)return done(false);
 function call(address,args){if(typeof resolve!=='function')throw Error('Original record presentation requires a resolver.');const e={address,args};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original record state.');state=structuredClone(r.state);}
 state.recordHolder=id|0x100;call(0x466fb0,[id,0]);call(0x45b180,[20]);
 if(typeof state.sourceText!=='string'||!signed(state.courseHoleCount))throw Error('Original record text unavailable.');
 state.sourceText+=' has just set a new course record of '+totals.playedStrokes+' strokes for '+((state.courseHoleCount-1)|0)+' holes! ';
 totals.completionBits=(totals.completionBits+1)|0;
 return done(true);
}
