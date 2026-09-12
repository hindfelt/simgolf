import {test,expect} from '@playwright/test';
import {createGame,build} from '../src/simulation/game.js';
import {treeCollision,treeGroundBlocker} from '../src/simulation/trees.js';
import {sceneryTrees} from '../src/simulation/scenery-trees.js';
import {key} from '../src/simulation/world.js';
import {treeScale} from '../src/simulation/tree-scale.js';
import {createCompetition,restoreCompetition} from '../src/simulation/competition.js';
import {exportCourse,courseDigest,importCourse,coursePractice} from '../src/simulation/course-package.js';
import {exportGolfer} from '../src/simulation/golfer-package.js';
test('desert planted canopies and trunks use their smaller visible dimensions',()=>{
 const g=createGame();g.tiles[key(26,17)]={type:'tree'};
 const shot={from:{x:0,z:0},landing:{x:20,z:0},apex:5,curve:0,putt:false};
 const from={x:0,z:1.2},to={x:20,z:1.2};
 expect(treeCollision(g,shot)).not.toBeNull();expect(treeGroundBlocker(g,from,to)(from,to)).toBe(true);
 g.environment='desert';expect(treeCollision(g,shot)).toBeNull();expect(treeGroundBlocker(g,from,to)(from,to)).toBe(false);
 expect(treeCollision(g,{...shot,apex:3})).not.toBeNull();
 expect(treeScale('desert',9,1,true)).toBe(.6);
});
test('natural desert tree scale is shared without modifying cached scenery identities',()=>{
 const g=createGame(),tree=sceneryTrees().find(t=>t.x===-11&&t.z===-31),before=JSON.stringify(sceneryTrees());
 const shot={from:{x:tree.x-8,z:tree.z+.5},landing:{x:tree.x+8,z:tree.z+.5},apex:tree.height,curve:0,putt:false};
 expect(treeCollision(g,shot)).not.toBeNull();g.environment='desert';expect(treeCollision(g,shot)).toBeNull();expect(JSON.stringify(sceneryTrees())).toBe(before);
});
async function oldTournament(environment,version=81,ruleset='aircraft-visits-2026-09-12'){
 const g=createGame(2002,'classic',environment);build(g,'tee',7,20);build(g,'green',36,5);
 const course=await exportCourse(g),golfer=exportGolfer(g),host=await createCompetition({id:'compatibility',course,rounds:1,seed:20,entrants:[{id:'alice',name:'Alice',golfer},{id:'bob',name:'Bob',golfer}]});
 host.execute(host.nextCommand('alice','shot',{x:1,z:0,technique:'straight'}),{id:'alice',role:'golfer'});
 const data=JSON.parse(host.save());data.ruleset=ruleset;data.config.course.content.ruleset=data.ruleset;data.config.course.digest=await courseDigest(data.config.course.content);
 for(const row of data.journal)if(row.type==='command')row.request.command.version=version;
 return data;
}
for(const [version,ruleset] of [[79,'original-signed-happiness-2026-09-12'],[80,'club-day-cycle-2026-09-12'],[81,'aircraft-visits-2026-09-12']])test(`non-desert tournament version ${version} translates and replays`,async()=>{
 const data=await oldTournament('parklands',version,ruleset);const host=await restoreCompetition(JSON.stringify(data));expect(host.roundSnapshot('alice').environment).toBe('parklands');
});
test('older desert layouts remain importable but changed-physics tournament replay is explicit',async()=>{
 const data=await oldTournament('desert'),raw=JSON.stringify(data);const layout=await importCourse(JSON.stringify(data.config.course));expect(coursePractice(layout).environment).toBe('desert');
 await expect(restoreCompetition(raw)).rejects.toThrow('older tree physics');expect(JSON.stringify(data)).toBe(raw);
});

test('palm crown leaves clear flight below and above its visible fronds',()=>{
 const g=createGame();g.tiles[key(26,17)]={type:'tree'};
 const shot={from:{x:0,z:1.5},landing:{x:20,z:1.5},apex:3.5,curve:0,putt:false};
 expect(treeCollision(g,shot)).not.toBeNull();
 g.environment='tropical';
 expect(treeCollision(g,shot)).toBeNull();
 expect(treeCollision(g,{...shot,apex:4.5})).not.toBeNull();
 expect(treeCollision(g,{...shot,apex:7})).toBeNull();
 const from={x:0,z:1.2},to={x:20,z:1.2};
 expect(treeGroundBlocker(g,from,to)(from,to)).toBe(true);
});
