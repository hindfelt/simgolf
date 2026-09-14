import {test,expect} from '@playwright/test';
for(const width of [900,390])test(`comparison is readable and dismissible at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.goto('/audio/credits.html');
 await page.evaluate(async()=>{
  const {originalGolferCard}=await import('/src/simulation/original-golfer-card.js');
  const {showGolferComparison}=await import('/src/ui/golfer-comparison.js');
  const state={defaultSkills:new Uint8Array([3,5,7,4,8,2,0,5,6,4])};
  const left=originalGolferCard(state,{actorId:-1,portraitId:0,x:0,title:'Frances vs...'});state.defaultSkills=new Uint8Array([5,4,3,8,2,0,7,6,2,5]);
  const right=originalGolferCard(state,{actorId:-1,portraitId:1,x:350,title:'George'});window.closedCount=0;
  window.comparison=showGolferComparison(document.body,[right,left],{onClose:()=>window.closedCount++});
 });
 const dialog=page.getByRole('dialog',{name:'Golfer comparison'});await expect(dialog).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'Frances',exact:true})).toBeVisible();
 await expect(dialog.getByRole('row')).toHaveCount(11);
 await expect(dialog.getByRole('row').filter({hasText:'Power Hitter'})).toContainText('30%50%');
 expect(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);
 await page.screenshot({path:`/tmp/baron-comparison-${width}.png`});
 if(width===390)await page.getByRole('button',{name:'Continue to tee'}).click();else await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>window.closedCount)).toBe(1);
 await page.evaluate(()=>comparison.close());expect(await page.evaluate(()=>window.closedCount)).toBe(1);
});
test('completed world tutorial supplies the comparison without publishing a suspended result',async({page})=>{
 await page.goto('/audio/credits.html');
 const result=await page.evaluate(async()=>{
  const {aimingWorld}=await import('/tests/helpers/original-aiming-world.js');
  const {createOriginalRuntimeSession}=await import('/src/simulation/original-runtime-session.js');
  const {resumeOriginalAimingTurn}=await import('/src/simulation/original-aiming-tutorial.js');
  const {originalTutorialGolferCard}=await import('/src/simulation/original-golfer-card.js');
  const {showGolferComparison}=await import('/src/ui/golfer-comparison.js');
  const state=aimingWorld();state.defaultSkills=new Uint8Array(10).fill(4);
  const resolve=(event,state)=>{
   if(event.address===0x466fb0)state.sourceText=event.args[0]===2?'George':'Frances';
   const presentationEvents=event.address===0x45e9c0?[{kind:'golfer-card',card:originalTutorialGolferCard(event,state)}]:[];
   return {state,presentationEvents,value:0,result:0,point:{x:0,y:0,visible:false}};
  };
  const session=createOriginalRuntimeSession(state,{resolve,resumeTurn:resumeOriginalAimingTurn,resolveWorld:(_,state)=>({state})},{ruleset:'test-aiming'});
  const pending=session.step();
  if(pending.completed||document.querySelector('dialog'))throw Error('Unexpected publication');
  if(session.drainPresentation().length)throw Error('Speculative cards escaped');
  const completed=session.resume();
  if(!completed.completed)throw Error('Unfinished tutorial');
  const cards=session.drainPresentation().map(e=>e.card);
  if(session.drainPresentation().length)throw Error('Cards repeated');
  showGolferComparison(document.body,cards);
  return {phase:session.read().phaseCounter,actor:session.read().selectedActor,cards:cards.length};
 });
 expect(result).toEqual({phase:31,actor:2,cards:2});
 await expect(page.getByRole('columnheader',{name:'Frances',exact:true})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'George',exact:true})).toBeVisible();
});
