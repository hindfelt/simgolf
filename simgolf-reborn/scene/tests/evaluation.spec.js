import { classifyHole } from "../src/simulation/hole-classification.js";
import {test,expect} from '@playwright/test';
import {createGame,build,openHole,update,serialize,restore,startPractice,takeShot} from '../src/simulation/game.js';
import {evaluationReport,newEvaluation,validateEvaluation,beginObservation,recordObservation} from '../src/simulation/evaluation.js';
const advance=(g,seconds)=>{for(let i=0;i<seconds/.05;i++)update(g,.05);};
function course(){const g=createGame(22);build(g,'tee',7,20);build(g,'green',23,17);for(let c=9;c<=21;c++)build(g,'fairway',c,19);return g;}
test('actual paid completions feed cohorts once and reconcile with per-hole results',()=>{
 const g=course();openHole(g);advance(g,160);const h=g.holes[0],r=evaluationReport(h);
 expect(r.count).toBeGreaterThan(0);expect(r.count).toBe(h.stats.completed);expect(r.cohorts.reduce((n,c)=>n+c.strokes,0)).toBe(h.stats.strokes);
 for(const s of r.skills)expect(s.withSkill.count+s.without.count).toBe(r.count);
 expect(r.seconds).toBeGreaterThan(0);expect(r.mood).toBeGreaterThanOrEqual(0);
 const resumed=restore(serialize(g));advance(g,50);advance(resumed,50);expect(serialize(resumed)).toBe(serialize(g));
});
test('practice never contributes; legacy in-progress holes do not fabricate a start time',()=>{
 const g=course();startPractice(g);takeShot(g,g.pro,g.holes[0].green);advance(g,20);expect(evaluationReport(g.holes[0]).count).toBe(0);
 const v={pro:false,strokes:3,skills:{length:true,accuracy:false,imagination:false},mood:80};beginObservation(g,v);expect(v.holeObservation).toBeUndefined();
});
test('marginal comparisons preserve trained groups and reject inflated observations',()=>{
 const stats={completed:4,strokes:18,evaluation:newEvaluation()};stats.evaluation.cohorts={0:{count:2,strokes:10,seconds:60,mood:150},9:{count:2,strokes:8,seconds:50,mood:160}};
 validateEvaluation(stats);const r=evaluationReport({stats});expect(r.skills[0].advantage).toBe(1);expect(r.skills[1].advantage).toBeNull();expect(r.cohorts[1].mask).toBe(9);
 stats.evaluation.cohorts[0].count=5;expect(()=>validateEvaluation(stats)).toThrow();
});
test('older saves start with empty observations while preserving historical scores',()=>{
 const g=course();openHole(g);advance(g,120);const completed=g.holes[0].stats.completed;expect(completed).toBeGreaterThan(0);
 delete g.holes[0].stats.evaluation;for(const v of g.guests)delete v.holeObservation;
 const migrated=restore(serialize(g));expect(migrated.holes[0].stats.completed).toBe(completed);expect(evaluationReport(migrated.holes[0]).count).toBe(0);
});
test('course report displays actual cohorts on a phone',async({page})=>{
 const g=course();openHole(g);advance(g,160);
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 await page.locator('#import').setInputFiles({name:'observations.json',mimeType:'application/json',buffer:Buffer.from(serialize(g))});await page.waitForFunction(()=>window.__gameTest?.getState().stats.holesCompleted>0);
 await page.locator('[data-mode="reports"]').click();await page.locator('#course-report').click();
 await expect(page.locator('#evaluation-content')).toContainText(`${g.holes[0].stats.completed} completed`);
 await expect(page.locator('#evaluation-content h3').first()).toContainText(classifyHole(evaluationReport(g.holes[0])).name || 'Unclassified');
 await expect(page.locator('#evaluation-content')).toContainText('Imagination');await page.locator('#evaluation-content summary').click();
 await page.screenshot({path:'../graphics/samples/course-report-phone.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('new score distributions reconcile, survive saves and never invent legacy samples',()=>{
 const g=course();openHole(g);advance(g,160);
 const h=g.holes[0];
 for (const c of Object.values(h.stats.evaluation.cohorts)) {
  expect(Object.values(c.scoreCounts).reduce((a,b)=>a+b,0)).toBe(c.count);
  expect(Object.entries(c.scoreCounts).reduce((a,[score,n])=>a+Number(score)*n,0)).toBe(c.strokes);
 }
 expect(restore(serialize(g)).holes[0].stats.evaluation).toEqual(h.stats.evaluation);
 const stats={completed:3,strokes:15,evaluation:{cohorts:{0:{count:3,strokes:15,seconds:60,mood:180,scoreCounts:{4:1}}}}};
 validateEvaluation(stats); // Only one of three older observations has a known score.
 stats.evaluation.cohorts[0].scoreCounts={4:3};expect(()=>validateEvaluation(stats)).toThrow();
 stats.evaluation.cohorts[0].scoreCounts={15:1};expect(()=>validateEvaluation(stats)).toThrow();
 stats.evaluation.cohorts[0].scoreCounts={5:3};validateEvaluation(stats);
});
