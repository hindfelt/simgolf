import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,chooseTarget,takeShot,lie,serialize} from '../src/simulation/game.js';
import {key,center} from '../src/simulation/world.js';
import {isOut} from '../src/simulation/landforming.js';
import {approachRoute} from '../src/simulation/approach-route.js';
test('route distance sees a dogleg barrier and follows the open end',()=>{
 const g=createGame();g.outOfBounds={};
 for(let r=0;r<35;r++)g.outOfBounds[key(22,r)]=true;
 const cup=center(30,10),cost=approachRoute(g,cup,()=> 'fairway');
 expect(cost(center(20,10))).toBeGreaterThan(cost(center(20,34)));
 expect(cost(center(22,10))).toBe(Infinity);
});
test('a golfer without imagination chooses a straight safe layup instead of a marked landing',()=>{
 const g=createGame();build(g,'tee',7,20);build(g,'green',36,5);startPractice(g);
 g.pro.skills.imagination=false;
 const direct=chooseTarget(g,g.pro),cell={c:Math.floor((direct.x+44)/2),r:Math.floor((direct.z+34)/2)};
 g.outOfBounds={};for(let c=cell.c-3;c<=cell.c+3;c++)for(let r=cell.r-3;r<=cell.r+3;r++)g.outOfBounds[key(c,r)]=true;
 const before=serialize(g),target=chooseTarget(g,g.pro);expect(serialize(g)).toBe(before);
 expect(target.technique).toBe('straight');takeShot(g,g.pro,target,target.technique);
 expect(isOut(g,g.pro.shot.end)).toBe(false);
});
