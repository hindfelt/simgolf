// 0x4230a7–0x42313e: accumulate one option and replace the winner strictly.
export function originalRouteBest(q) {
 const score=(q.score+q.sampleScore)|0;
 const threshold=Math.trunc(Math.imul((q.level+4)|0,q.samples)/8)|0;
 const searchFlag=q.goodLandings>=threshold?0:q.searchFlag;
 const improved=score<q.winner.score;
 const winner=improved?{score,target:{...q.target},curve:q.curve,cornerTarget:q.cornerTarget,
  landing:{...q.landing},landingFlag:q.sampleFlags&1}:structuredClone(q.winner);
 return {score,searchFlag,winner};
}
